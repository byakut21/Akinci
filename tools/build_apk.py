#!/usr/bin/env python3
"""Minimal APK builder (no Android SDK): hand-assembled DEX + binary manifest +
resources.arsc + APK Signature Scheme v2. Wraps an HTML5 game in a WebView."""
import struct, hashlib, zlib, zipfile, io, os, sys

PKG = "com.akinci.sinirboyu"
CLS = "Lcom/akinci/sinirboyu/MainActivity;"
LABEL = "Akıncı"
VERSION_CODE, VERSION_NAME = 3, "1.2"
MIN_SDK, TARGET_SDK = 24, 34
HERE = os.path.dirname(os.path.abspath(__file__))

def uleb(n):
    out = bytearray()
    while True:
        b = n & 0x7f; n >>= 7
        if n: out.append(b | 0x80)
        else: out.append(b); return bytes(out)

def align(buf, a):
    while len(buf) % a: buf.append(0)

# ------------------------------------------------------------------ DEX
def build_dex():
    A, B, WV, WS, CTX, VIEW, STR, WIN = ("Landroid/app/Activity;", "Landroid/os/Bundle;", "Landroid/webkit/WebView;",
        "Landroid/webkit/WebSettings;", "Landroid/content/Context;", "Landroid/view/View;", "Ljava/lang/String;", "Landroid/view/Window;")
    URL = "file:///android_asset/index.html"
    # protos: (return, params)
    protos_spec = {
        "V()": ("V", ()), "V(B)": ("V", (B,)), "V(CTX)": ("V", (CTX,)), "WS()": (WS, ()),
        "V(Z)": ("V", ("Z",)), "V(S)": ("V", (STR,)), "V(VIEW)": ("V", (VIEW,)), "WIN()": (WIN, ()), "V(I)": ("V", ("I",)),
    }
    methods_spec = [  # (class, name, protokey)
        (A, "<init>", "V()"), (A, "onCreate", "V(B)"), (A, "setContentView", "V(VIEW)"), (A, "getWindow", "WIN()"),
        (CLS, "<init>", "V()"), (CLS, "onCreate", "V(B)"),
        (WV, "<init>", "V(CTX)"), (WV, "getSettings", "WS()"), (WV, "loadUrl", "V(S)"),
        (WS, "setJavaScriptEnabled", "V(Z)"), (WS, "setDomStorageEnabled", "V(Z)"),
        (WIN, "addFlags", "V(I)"),
    ]
    def shorty(t): return "L" if t.startswith("L") or t.startswith("[") else t
    types = set([CLS, A])
    strings = set([URL])
    for r, ps in protos_spec.values():
        types.add(r); types.update(ps)
        strings.add(shorty(r) + "".join(shorty(p) for p in ps))
    for c, n, _ in methods_spec:
        types.add(c); strings.add(n)
    strings.update(types)
    strings = sorted(strings, key=lambda s: s.encode("utf-16-be"))
    sidx = {s: i for i, s in enumerate(strings)}
    types = sorted(types, key=lambda t: sidx[t])
    tidx = {t: i for i, t in enumerate(types)}
    plist = []
    for k, (r, ps) in protos_spec.items():
        plist.append((tidx[r], tuple(tidx[p] for p in ps), k, r, ps))
    plist.sort(key=lambda x: (x[0], x[1]))
    pidx = {p[2]: i for i, p in enumerate(plist)}
    mlist = sorted(methods_spec, key=lambda m: (tidx[m[0]], sidx[m[1]], pidx[m[2]]))
    midx = {(m[0], m[1]): i for i, m in enumerate(mlist)}
    M = lambda c, n: midx[(c, n)]

    def i35c(op, regs, ref):
        a = len(regs); r = list(regs) + [0] * (5 - a)
        return [(a << 12) | (0 << 8) | op, ref, (r[3] << 12) | (r[2] << 8) | (r[1] << 4) | r[0]]
    # <init>: p0 = v0
    init_code = i35c(0x70, [0], M(A, "<init>")) + [0x000e]
    # onCreate: v0..v2 locals, p0=v3, p1=v4
    oc = []
    oc += i35c(0x6f, [3, 4], M(A, "onCreate"))
    oc += i35c(0x6e, [3], M(A, "getWindow")); oc += [(1 << 8) | 0x0c]        # move-result-object v1
    oc += [(2 << 8) | 0x13, 0x0080]                                            # const/16 v2, 0x80 (KEEP_SCREEN_ON)
    oc += i35c(0x6e, [1, 2], M(WIN, "addFlags"))
    oc += [(0 << 8) | 0x22, tidx[WV]]                                          # new-instance v0, WebView
    oc += i35c(0x70, [0, 3], M(WV, "<init>"))
    oc += i35c(0x6e, [0], M(WV, "getSettings")); oc += [(1 << 8) | 0x0c]
    oc += [(1 << 12) | (2 << 8) | 0x12]                                        # const/4 v2, 1
    oc += i35c(0x6e, [1, 2], M(WS, "setJavaScriptEnabled"))
    oc += i35c(0x6e, [1, 2], M(WS, "setDomStorageEnabled"))
    oc += [(1 << 8) | 0x1a, sidx[URL]]                                         # const-string v1, URL
    oc += i35c(0x6e, [0, 1], M(WV, "loadUrl"))
    oc += i35c(0x6e, [3, 0], M(A, "setContentView"))
    oc += [0x000e]
    codes = [(1, 1, 1, init_code), (5, 2, 2, oc)]

    # layout
    HDR = 0x70
    off = HDR
    string_ids_off = off; off += 4 * len(strings)
    type_ids_off = off; off += 4 * len(types)
    proto_ids_off = off; off += 12 * len(plist)
    method_ids_off = off; off += 8 * len(mlist)
    class_defs_off = off; off += 32
    data_off = off
    data = bytearray()
    def pos(): return data_off + len(data)
    # code items
    code_offs = []
    for regs, ins, outs, insns in codes:
        align(data, 4); code_offs.append(pos())
        data += struct.pack("<HHHHII", regs, ins, outs, 0, 0, len(insns))
        data += b"".join(struct.pack("<H", w & 0xffff) for w in insns)
    code_count = len(codes); code_start = code_offs[0]
    # type lists
    align(data, 4)
    tl_offs = {}; tl_start = pos(); tl_count = 0
    for p in plist:
        if p[1] and p[1] not in tl_offs:
            align(data, 4); tl_offs[p[1]] = pos(); tl_count += 1
            data += struct.pack("<I", len(p[1])) + b"".join(struct.pack("<H", t) for t in p[1])
    # string data
    sd_start = pos(); sd_offs = []
    for s in strings:
        sd_offs.append(pos())
        u16len = len(s.encode("utf-16-le")) // 2
        data += uleb(u16len) + s.encode("utf-8") + b"\0"   # ascii only here
    # class data
    cd_off = pos()
    mi_init, mi_oc = M(CLS, "<init>"), M(CLS, "onCreate")
    data += uleb(0) + uleb(0) + uleb(1) + uleb(1)
    data += uleb(mi_init) + uleb(0x10001) + uleb(code_offs[0])
    data += uleb(mi_oc) + uleb(0x1) + uleb(code_offs[1])
    # map list
    align(data, 4); map_off = pos()
    entries = [(0x0000, 1, 0), (0x0001, len(strings), string_ids_off), (0x0002, len(types), type_ids_off),
               (0x0003, len(plist), proto_ids_off), (0x0005, len(mlist), method_ids_off), (0x0006, 1, class_defs_off),
               (0x2001, code_count, code_start), (0x1001, tl_count, tl_start), (0x2002, len(strings), sd_start),
               (0x2000, 1, cd_off), (0x1000, 1, map_off)]
    data += struct.pack("<I", len(entries))
    for t, n, o in entries: data += struct.pack("<HHII", t, 0, n, o)
    align(data, 4)
    file_size = data_off + len(data)

    out = bytearray(file_size)
    p = string_ids_off
    for o in sd_offs: struct.pack_into("<I", out, p, o); p += 4
    p = type_ids_off
    for t in types: struct.pack_into("<I", out, p, sidx[t]); p += 4
    p = proto_ids_off
    for rt, ps, k, r, pl in plist:
        sh = shorty(r) + "".join(shorty(x) for x in pl)
        struct.pack_into("<III", out, p, sidx[sh], rt, tl_offs.get(ps, 0)); p += 12
    p = method_ids_off
    for c, n, pk in mlist: struct.pack_into("<HHI", out, p, tidx[c], pidx[pk], sidx[n]); p += 8
    struct.pack_into("<IIIIIIII", out, class_defs_off, tidx[CLS], 0x1, tidx[A], 0, 0xffffffff, 0, cd_off, 0)
    out[data_off:] = data
    out[0:8] = b"dex\n035\0"
    vals = [file_size, HDR, 0x12345678, 0, 0, map_off, len(strings), string_ids_off, len(types), type_ids_off,
            len(plist), proto_ids_off, 0, 0, len(mlist), method_ids_off, 1, class_defs_off, file_size - data_off, data_off]
    struct.pack_into("<" + "I" * len(vals), out, 32, *vals)
    out[12:32] = hashlib.sha1(bytes(out[32:])).digest()
    struct.pack_into("<I", out, 8, zlib.adler32(bytes(out[12:])) & 0xffffffff)
    return bytes(out)

# ------------------------------------------------------------------ string pool (UTF-8)
def string_pool(strs):
    def enc_len(n):
        return bytes([n]) if n < 0x80 else bytes([0x80 | (n >> 8), n & 0xff])
    offs, body = [], bytearray()
    for s in strs:
        offs.append(len(body)); b = s.encode("utf-8")
        body += enc_len(len(s.encode("utf-16-le")) // 2) + enc_len(len(b)) + b + b"\0"
    align(body, 4)
    hdr_size = 28; strings_start = hdr_size + 4 * len(strs)
    size = strings_start + len(body)
    return struct.pack("<HHIIIIII", 0x0001, hdr_size, size, len(strs), 0, 0x100, strings_start, 0) + \
        b"".join(struct.pack("<I", o) for o in offs) + bytes(body)

# ------------------------------------------------------------------ binary AndroidManifest.xml
ICON_ID = 0x7f010000
def build_manifest():
    ANDROID_NS = "http://schemas.android.com/apk/res/android"
    T_REF, T_STR, T_DEC, T_HEX, T_BOOL = 0x01, 0x03, 0x10, 0x11, 0x12
    RID = {"theme": 0x01010000, "label": 0x01010001, "icon": 0x01010002, "name": 0x01010003, "exported": 0x01010010,
           "screenOrientation": 0x0101001e, "configChanges": 0x0101001f, "minSdkVersion": 0x0101020c,
           "versionCode": 0x0101021b, "versionName": 0x0101021c, "targetSdkVersion": 0x01010270,
           "allowBackup": 0x01010280, "hardwareAccelerated": 0x010102d3}
    attr_names = list(RID.keys())
    # (tag, [(ns?, name, type, value)], children)
    A = lambda n, t, v: (True, n, t, v)
    tree = ("manifest", [A("versionCode", T_DEC, VERSION_CODE), A("versionName", T_STR, VERSION_NAME), (False, "package", T_STR, PKG)], [
        ("uses-sdk", [A("minSdkVersion", T_DEC, MIN_SDK), A("targetSdkVersion", T_DEC, TARGET_SDK)], []),
        ("application", [A("theme", T_REF, 0x01030007), A("label", T_STR, LABEL), A("icon", T_REF, ICON_ID),
                         A("allowBackup", T_BOOL, True), A("hardwareAccelerated", T_BOOL, True)], [
            ("activity", [A("name", T_STR, PKG + ".MainActivity"), A("exported", T_BOOL, True),
                          A("screenOrientation", T_DEC, 1), A("configChanges", T_HEX, 0x4a0)], [
                ("intent-filter", [], [
                    ("action", [A("name", T_STR, "android.intent.action.MAIN")], []),
                    ("category", [A("name", T_STR, "android.intent.category.LAUNCHER")], []),
                ])])])])
    strs = list(attr_names)
    def S(s):
        if s not in strs: strs.append(s)
        return strs.index(s)
    S("android"); S(ANDROID_NS)
    def collect(node):
        tag, attrs, kids = node; S(tag)
        for ns, n, t, v in attrs:
            S(n)
            if t == T_STR: S(v)
        for k in kids: collect(k)
    collect(tree)
    chunks = bytearray()
    ns_i, uri_i = S("android"), S(ANDROID_NS)
    chunks += struct.pack("<HHIIIII", 0x0100, 16, 24, 1, 0xffffffff, ns_i, uri_i)
    def emit(node, line=[1]):
        tag, attrs, kids = node
        line[0] += 1
        enc = []
        for ns, n, t, v in sorted(attrs, key=lambda a: RID.get(a[1], 0xffffffff) if a[0] else -1):
            raw = S(v) if t == T_STR else 0xffffffff
            data = S(v) if t == T_STR else (0xffffffff if (t == T_BOOL and v) else (0 if t == T_BOOL else v))
            enc.append(struct.pack("<IIIHBBI", uri_i if ns else 0xffffffff, S(n), raw, 8, 0, t, data))
        body = struct.pack("<IIHHHHHH", 0xffffffff, S(tag), 20, 20, len(enc), 0, 0, 0) + b"".join(enc)
        chunks.extend(struct.pack("<HHIII", 0x0102, 16, 16 + len(body), line[0], 0xffffffff) + body)
        for k in kids: emit(k)
        chunks.extend(struct.pack("<HHIIIII", 0x0103, 16, 24, line[0], 0xffffffff, 0xffffffff, S(tag)))
    emit(tree)
    chunks += struct.pack("<HHIIIII", 0x0101, 16, 24, 1, 0xffffffff, ns_i, uri_i)
    pool = string_pool(strs)
    resmap = struct.pack("<HHI", 0x0180, 8, 8 + 4 * len(attr_names)) + b"".join(struct.pack("<I", RID[n]) for n in attr_names)
    body = pool + resmap + bytes(chunks)
    return struct.pack("<HHI", 0x0003, 8, 8 + len(body)) + body

# ------------------------------------------------------------------ resources.arsc (one mipmap)
ICON_PATH = "res/mipmap/ic_launcher.png"
def build_arsc():
    gpool = string_pool([ICON_PATH])
    tpool = string_pool(["mipmap"])
    kpool = string_pool(["ic_launcher"])
    spec = struct.pack("<HHIBBHI", 0x0202, 16, 16 + 4, 1, 0, 0, 1) + struct.pack("<I", 0)
    config = struct.pack("<I", 64) + b"\0" * 60
    entry = struct.pack("<HHI", 8, 0, 0) + struct.pack("<HBBI", 8, 0, 0x03, 0)
    hsize = 20 + len(config)
    entries_start = hsize + 4
    tchunk = struct.pack("<HHIBBHII", 0x0201, hsize, entries_start + len(entry), 1, 0, 0, 1, entries_start) + config + struct.pack("<I", 0) + entry
    name = PKG.encode("utf-16-le").ljust(256, b"\0")
    PH = 288
    type_off = PH; key_off = PH + len(tpool)
    pkg_body = tpool + kpool + spec + tchunk
    pkg = struct.pack("<HHII", 0x0200, PH, PH + len(pkg_body), 0x7f) + name + struct.pack("<IIIII", type_off, 1, key_off, 1, 0) + pkg_body
    body = gpool + pkg
    return struct.pack("<HHII", 0x0002, 12, 12 + len(body), 1) + body

# ------------------------------------------------------------------ zip + v2 signing
def build_zip(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for name, data, stored in files:
            zi = zipfile.ZipInfo(name, date_time=(2026, 11, 17, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16; zi.create_system = 0
            if stored:
                base = buf.tell() + 30 + len(name.encode()) + 4
                n = (-base) % 4
                zi.extra = struct.pack("<HH", 0xd935, n) + b"\0" * n
            z.writestr(zi, data)
    return buf.getvalue()

def lp(b): return struct.pack("<I", len(b)) + b

def sign_v2(apk, key, cert_der):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    eocd = apk.rfind(b"PK\x05\x06")
    cd_off = struct.unpack_from("<I", apk, eocd + 16)[0]
    secs = [apk[:cd_off], apk[cd_off:eocd], apk[eocd:]]
    chunks = []
    for s in secs:
        for i in range(0, len(s), 1 << 20):
            c = s[i:i + (1 << 20)]
            chunks.append(hashlib.sha256(b"\xa5" + struct.pack("<I", len(c)) + c).digest())
    digest = hashlib.sha256(b"\x5a" + struct.pack("<I", len(chunks)) + b"".join(chunks)).digest()
    ALG = 0x0103
    signed_data = lp(lp(struct.pack("<I", ALG) + lp(digest))) + lp(lp(cert_der)) + lp(b"")
    sig = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    pub = key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed_data) + lp(lp(struct.pack("<I", ALG) + lp(sig))) + lp(pub)
    value = lp(lp(signer))
    pair = struct.pack("<Q", 4 + len(value)) + struct.pack("<I", 0x7109871a) + value
    size = len(pair) + 8 + 16
    block = struct.pack("<Q", size) + pair + struct.pack("<Q", size) + b"APK Sig Block 42"
    new_eocd = bytearray(secs[2]); struct.pack_into("<I", new_eocd, 16, cd_off + len(block))
    return secs[0] + block + secs[1] + bytes(new_eocd)

def load_key():
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    import datetime
    kp, cp = os.path.join(HERE, "release-key.pem"), os.path.join(HERE, "release-cert.der")
    if os.path.exists(kp):
        key = serialization.load_pem_private_key(open(kp, "rb").read(), None)
        return key, open(cp, "rb").read()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Akinci Sinir Boyu"), x509.NameAttribute(NameOID.COUNTRY_NAME, "TR")])
    now = datetime.datetime(2026, 1, 1)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now)
            .not_valid_after(now + datetime.timedelta(days=365 * 30)).sign(key, hashes.SHA256()))
    open(kp, "wb").write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    der = cert.public_bytes(serialization.Encoding.DER); open(cp, "wb").write(der)
    return key, der

def main(html_path, icon_path, out_path):
    files = [("AndroidManifest.xml", build_manifest(), False),
             ("resources.arsc", build_arsc(), True),
             ("classes.dex", build_dex(), False),
             (ICON_PATH, open(icon_path, "rb").read(), True),
             ("assets/index.html", open(html_path, "rb").read(), False)]
    apk = build_zip(files)
    key, cert = load_key()
    open(out_path, "wb").write(sign_v2(apk, key, cert))
    print("wrote", out_path, os.path.getsize(out_path))

if __name__ == "__main__":
    main(*sys.argv[1:4])
