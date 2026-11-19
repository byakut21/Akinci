"""Godot'un imzasız APK'sını 4 bayt hizalar ve release-key.pem ile v2 imzalar.
Kullanım: python3 tools/sign_apk.py girdi.apk cikti.apk"""
import sys, io, zipfile, struct
sys.path.insert(0, __import__('os').path.dirname(__file__))
from build_apk import sign_v2, load_key

def realign(src):
    zin = zipfile.ZipFile(io.BytesIO(src))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for zi in zin.infolist():
            if zi.filename.startswith("META-INF/") and zi.filename.split("/")[-1].split(".")[-1] in ("SF", "RSA", "EC", "MF"):
                continue
            data = zin.read(zi)
            n = zipfile.ZipInfo(zi.filename, date_time=zi.date_time)
            n.compress_type = zi.compress_type; n.external_attr = zi.external_attr; n.create_system = 0
            if zi.compress_type == zipfile.ZIP_STORED:
                al = 4096 if zi.filename.endswith(".so") else 4
                base = buf.tell() + 30 + len(zi.filename.encode()) + 4
                pad = (-base) % al
                n.extra = struct.pack("<HH", 0xd935, pad) + b"\0" * pad
            z.writestr(n, data, compresslevel=9 if zi.compress_type else None)
    return buf.getvalue()

if __name__ == "__main__":
    key, cert = load_key()
    out = sign_v2(realign(open(sys.argv[1], "rb").read()), key, cert)
    open(sys.argv[2], "wb").write(out); print("wrote", sys.argv[2], len(out))
