class_name Data
## Static game data: civilisations, units, buildings, ages, story, quests.

const CIVS := [
	{ "id": "osmanli", "name": "Osmanlı", "full": "Osmanlı Devleti", "color": Color("#d4373f"), "hero": "heroT", "uniq": "atliokcu", "uname": "SİPAHİ", "bonus": "Sipahi: güçlü atlı okçu · Atlı birlikler %20 ucuz", "mod": { "horseCost": 0.8 } },
	{ "id": "roma", "name": "Roma", "full": "Roma İmparatorluğu", "color": Color("#9b59d6"), "hero": "heroK", "uniq": "piyade", "uname": "LEJYONER", "bonus": "Lejyoner: zırhlı piyade · Binalar %20 daha az taş", "mod": { "bldCost": 0.8 } },
	{ "id": "germen", "name": "Germen", "full": "Germen Boyları", "color": Color("#7b8494"), "hero": "heroK", "uniq": "baltaci", "uname": "BERSERKER", "bonus": "Berserker: öfkeli baltacı · Piyadeler %20 ucuz", "mod": { "footCost": 0.8 } },
	{ "id": "ingiliz", "name": "İngiliz", "full": "İngiliz Krallığı", "color": Color("#2f7ae0"), "hero": "heroK", "uniq": "okcu", "uname": "UZUN YAYCI", "bonus": "Uzun yaycı: çok uzak menzil · Kuleler %40 güçlü", "mod": { "towerDmg": 1.4 } },
	{ "id": "arap", "name": "Arap", "full": "Arap Emirliği", "color": Color("#22a85a"), "hero": "heroT", "uniq": "suvari", "uname": "BEDEVİ", "bonus": "Bedevi: hızlı süvari · Yiyecek toplama %25 hızlı", "mod": { "foodRate": 1.25 } },
	{ "id": "pers", "name": "Pers", "full": "Pers İmparatorluğu", "color": Color("#e08a1e"), "hero": "heroT", "uniq": "piyade", "uname": "ÖLÜMSÜZ", "bonus": "Ölümsüzler: seçkin muhafız · Altın toplama %25 hızlı", "mod": { "goldRate": 1.25 } },
]

const UT := {
	"koylu": { "name": "Köylü", "model": "villager", "h": 2.3, "hp": 30.0, "dmg": 3.0, "range": 12.0, "cd": 1.1, "spd": 58.0, "r": 8.0, "pop": 1, "cost": { "f": 50 }, "atk": "1H_Melee_Attack_Chop", "civil": true },
	"piyade": { "name": "Piyade", "model": "knight", "h": 2.5, "hp": 70.0, "dmg": 10.0, "range": 14.0, "cd": 0.9, "spd": 58.0, "r": 9.0, "pop": 1, "cost": { "f": 40, "g": 10 }, "atk": "1H_Melee_Attack_Chop", "snd": "sword", "foot": true },
	"baltaci": { "name": "Baltacı", "model": "barbarian", "h": 2.6, "hp": 120.0, "dmg": 18.0, "range": 16.0, "cd": 1.3, "spd": 54.0, "r": 10.0, "pop": 1, "cost": { "f": 60, "g": 25 }, "atk": "2H_Melee_Attack_Chop", "idle": "2H_Melee_Idle", "cleave": 22.0, "snd": "axe", "foot": true },
	"okcu": { "name": "Okçu", "model": "rogue", "h": 2.4, "hp": 40.0, "dmg": 8.0, "range": 150.0, "cd": 1.2, "spd": 58.0, "r": 8.0, "pop": 1, "cost": { "f": 30, "g": 25 }, "atk": "2H_Ranged_Shoot", "ranged": true, "foot": true },
	"suvari": { "name": "Süvari", "model": "knight", "horse": true, "h": 2.5, "hp": 125.0, "dmg": 14.0, "range": 18.0, "cd": 1.0, "spd": 112.0, "r": 13.0, "pop": 2, "cost": { "f": 60, "g": 45 }, "atk": "1H_Melee_Attack_Chop", "snd": "sword" },
	"atliokcu": { "name": "Atlı Okçu", "model": "rogue", "horse": true, "h": 2.4, "hp": 85.0, "dmg": 9.0, "range": 140.0, "cd": 1.1, "spd": 118.0, "r": 13.0, "pop": 2, "cost": { "f": 50, "g": 55 }, "atk": "2H_Ranged_Shoot", "ranged": true },
	"hero": { "name": "Paşa", "horse": true, "h": 2.45, "hp": 260.0, "dmg": 16.0, "range": 165.0, "cd": 0.5, "spd": 235.0, "r": 14.0, "pop": 0, "cost": {} },
}

const UNIQ := {
	"osmanli": { "hp": 1.3, "dmg": 1.35, "range": 1.1 }, "roma": { "hp": 1.55, "dmg": 1.15 }, "germen": { "hp": 1.2, "dmg": 1.45, "spd": 1.15 },
	"ingiliz": { "range": 1.4, "dmg": 1.35 }, "arap": { "spd": 1.25, "hp": 1.15, "dmg": 1.1 }, "pers": { "hp": 1.45, "dmg": 1.3, "spd": 1.08 },
}

## w = footprint width in world units
const BT := {
	"castle": { "name": "Kale", "hp": 1400.0, "r": 46.0, "w": 10.0, "range": 185.0, "dmg": 9.0, "cd": 1.2 },
	"house": { "name": "Ev", "hp": 300.0, "r": 22.0, "w": 4.6, "cost": { "s": 40 } },
	"farm": { "name": "Tarla", "hp": 250.0, "r": 26.0, "w": 6.6, "walk": true, "cost": { "s": 30 } },
	"mine": { "name": "Altın Madeni", "hp": 500.0, "r": 28.0, "w": 6.0 },
	"quarry": { "name": "Taş Ocağı", "hp": 500.0, "r": 28.0, "w": 6.0 },
	"barracks": { "name": "Kışla", "hp": 600.0, "r": 30.0, "w": 6.6, "cost": { "s": 100 } },
	"archery": { "name": "Okçu Meydanı", "hp": 550.0, "r": 30.0, "w": 6.6, "cost": { "s": 100, "g": 20 } },
	"stable": { "name": "Ahır", "hp": 650.0, "r": 32.0, "w": 7.0, "cost": { "s": 120, "g": 40 } },
	"tower": { "name": "Kule", "hp": 600.0, "r": 20.0, "w": 3.6, "range": 195.0, "dmg": 10.0, "cd": 0.9, "cost": { "s": 80, "g": 20 } },
}

## Quaternius RTS models per building and age (0 Köy, 1 Feodal, 2 Kale)
const BMODEL := {
	"castle": ["TowerHouse_FirstAge", "TowerHouse_SecondAge", "Wonder_SecondAge_Level3"],
	"house": ["Houses_FirstAge_1_Level3", "Houses_SecondAge_1_Level1", "Houses_SecondAge_1_Level3"],
	"house_b": ["Houses_FirstAge_2_Level3", "Houses_FirstAge_2_Level3", "Houses_SecondAge_2_Level1"],
	"farm": ["Farm_FirstAge_Level2_Wheat", "Farm_FirstAge_Level3_Wheat", "Farm_SecondAge_Level3_Wheat"],
	"barracks": ["Barracks_FirstAge_Level1", "Barracks_FirstAge_Level3", "Barracks_SecondAge_Level3"],
	"archery": ["Archery_FirstAge_Level1", "Archery_FirstAge_Level3", "Archery_SecondAge_Level3"],
	"stable": ["Storage_SecondAge_Level2", "Storage_SecondAge_Level2", "Storage_SecondAge_Level3"],
	"tower": ["WatchTower_FirstAge_Level3", "WatchTower_FirstAge_Level3", "WatchTower_SecondAge_Level1"],
	"mine": ["Mine", "Mine", "Mine"],
}

const AGES := [
	{ "name": "Köy Çağı", "short": "KÖY" },
	{ "name": "Feodal Çağ", "short": "FEODAL", "cost": { "f": 300, "s": 120 }, "time": 18.0 },
	{ "name": "Kale Çağı", "short": "KALE", "cost": { "f": 500, "s": 220, "g": 180 }, "time": 26.0 },
]
const NEED_AGE := { "barracks": 1, "archery": 1, "tower": 1, "stable": 2, "upg": 2 }

## kingdom layout in local px (f = toward map centre, s = side)
const SLOTS := {
	"castle": Vector2(0, 0), "mine": Vector2(-40, -175), "quarry": Vector2(-40, 175),
	"farm": [Vector2(-185, -75), Vector2(-185, 75), Vector2(-252, -150), Vector2(-252, 150)],
	"house": [Vector2(-110, -255), Vector2(-110, 255), Vector2(5, -280), Vector2(5, 280), Vector2(-195, -230), Vector2(-195, 230)],
	"barracks": Vector2(70, -175), "archery": Vector2(70, 175), "stable": Vector2(170, -215), "tower": [Vector2(262, -218), Vector2(262, 218)],
	"windmill": Vector2(-268, 0), "rally": Vector2(178, 0),
	# town decoration that appears as the kingdom ages
	"deco1": [Vector2(-70, -70), Vector2(-70, 70)], "deco2": [Vector2(45, -95), Vector2(45, 95)],
}

const INTRO := {
	"osmanli": "Söğüt'ten çıkan küçük bir aşiretin torunlarısın. Sınır Boyu'nun bereketli ovalarına obanı kurdun; ama dört bir yanda kendi tahtını büyütmek isteyen hükümdarlar var. Önce köyünü büyüt, ocaklarını yak, sonra cihana nizam ver.",
	"roma": "İmparatorluğun son lejyonları denizin kıyısına ulaştı. Senato artık yok, kartal sancağı senin elinde. Bu topraklarda yeni bir Roma kurmak için önce taş ocaklarını aç, yollarını döşe, sonra lejyonlarını yürüt.",
	"germen": "Ormanların çocukları, kuzeyin soğuğundan güneyin altın ovalarına indi. Boyların reisi sensin. Kütüklerden evler yap, tarlaları sür; berserkerlerin hazır olduğunda hiçbir sur sizi durduramayacak.",
	"ingiliz": "Fırtınalı denizleri aşan gemilerin bu kıyıya demir attı. Taç senin başında ama krallık henüz bir avuç köylüden ibaret. Tarlaları sür, kuleleri yükselt; uzun yaycıların düşmanı daha surlara varmadan durduracak.",
	"arap": "Çölün rüzgârı seni bu yeşil topraklara getirdi. Emirlik küçük ama hayallerin büyük. Kuyular kaz, tarlaları sula, ahırlarını doldur; bedevi atlıların bir gün bütün ovayı tek nefeste geçecek.",
	"pers": "Şahlar şahının sancağı, iç denizin kıyısında yeniden dalgalanıyor. Hazinen boş, ordun dağınık. Altın madenlerini işlet, ölümsüzlerini topla; bu topraklar bir kez daha büyük bir imparatorluğun olacak.",
}

static func story(id: String, civ: Dictionary) -> Dictionary:
	match id:
		"intro":
			return { "t": civ.full, "b": INTRO[civ.id] + "\n\n[b]Beş krallık[/b] aynı ovaya yerleşti. Barış uzun sürmeyecek: güçlenen her hükümdar komşusunu istila etmek isteyecek. Önce köyünü kur, çağ atla, sonra ordunu topla." }
		"feodal":
			return { "t": "Feodal Çağ", "b": "Köyün bir kasabaya dönüştü. Artık [b]kışla, okçu meydanı ve kule[/b] kurabilirsin. Komşuların da güçleniyor; sınırlarını korumanın zamanı geldi." }
		"kale":
			return { "t": "Kale Çağı", "b": "Kaleni taş surlarla yükselttin. [b]Ahır[/b] kurup süvari ve atlı okçu yetiştirebilir, [b]talim[/b] ile ordunu güçlendirebilirsin. Özel birliğin [b]" + civ.uname + "[/b] artık hazır." }
		"war":
			return { "t": "Barış Bitti", "b": "Elçiler geri çağrıldı, sınır taşları söküldü. Kale Çağı'na ulaşan krallıklar artık birbirini istila edecek. Sancağını kaldır: [b]SANCAĞA[/b] alanıyla ordunu peşine tak ve fethe çık." }
	return {}

const QUESTS := [
	{ "t": "Köyü Kur", "d": "Köylü sayını 7'ye çıkar", "id": "vill", "of": 7, "rw": { "f": 100 } },
	{ "t": "Haneler", "d": "2 ev inşa et", "id": "houses", "of": 2, "rw": { "s": 80 } },
	{ "t": "Bereketli Topraklar", "d": "2 tarla daha sür", "id": "farms", "of": 2, "rw": { "g": 60 } },
	{ "t": "Feodal Çağ", "d": "Kalede ÇAĞ ATLA", "id": "age1", "of": 1, "rw": { "f": 150, "s": 100 } },
	{ "t": "Sınır Muhafızları", "d": "Kışla kur, 5 asker yetiştir", "id": "army5", "of": 5, "rw": { "g": 100 } },
	{ "t": "Gözcü Kuleleri", "d": "1 kule inşa et", "id": "tower", "of": 1, "rw": { "s": 120 } },
	{ "t": "Kale Çağı", "d": "Kale Çağı'na geç", "id": "age2", "of": 1, "rw": { "g": 150 } },
	{ "t": "Süvari Ocağı", "d": "Ahır kur, 3 atlı yetiştir", "id": "horse3", "of": 3, "rw": { "f": 200, "g": 100 } },
	{ "t": "İlk Fetih", "d": "Bir krallığın kalesini yık", "id": "conq1", "of": 1, "rw": { "g": 300 } },
	{ "t": "Cihan Hakimiyeti", "d": "Tüm krallıkları fethet", "id": "conqall", "of": 4, "rw": {} },
]

const RES_NAME := { "f": "yiyecek", "s": "taş", "g": "altın" }
