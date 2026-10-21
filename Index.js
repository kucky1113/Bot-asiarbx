import os
import json
import random
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

# ============================================================
#  KONFIGURASI
# ============================================================
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = os.getenv("GUILD_ID")  # Opsional: isi ID server agar slash command langsung muncul

ROLE_PERWIRA_TINGGI = 1303837318515527680
PING_USER_ID = 1327599715776331780
BLACKLIST_FILE = "blacklist.json"

NAMA_KOMUNITAS = "ASIARBX"
LINK_KOMUNITAS = "https://www.roblox.com/communities/35410442/ASIA-Akpol-Semarang-Indonesia-Academy#!/about"
LINK_RONATION = "https://discord.gg/TRBkk2z5m2"

WARNA_UTAMA = discord.Color.from_rgb(16, 42, 84)    # Navy
WARNA_EMAS = discord.Color.from_rgb(201, 162, 39)   # Emas
WARNA_MERAH = discord.Color.from_rgb(138, 28, 28)   # Merah tua
WARNA_HIJAU = discord.Color.from_rgb(35, 110, 70)   # Hijau tua

DAFTAR_KHODAM = [
    "Macan Kumbang Penjaga Malam",
    "Naga Api Cakrawala",
    "Garuda Emas Nusantara",
    "Harimau Putih Gunung Salak",
    "Kuda Laut Berzirah Baja",
    "Elang Badai Samudra",
    "Ular Kencana Pelindung Hutan",
    "Banteng Hitam Tanah Rencong",
    "Rajawali Petir Khatulistiwa",
    "Kijang Bulan Sabit",
]


# ============================================================
#  BLACKLIST
# ============================================================
def load_blacklist() -> dict:
    if not os.path.exists(BLACKLIST_FILE):
        return {}
    with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def save_blacklist(data: dict) -> None:
    with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ============================================================
#  TREE KUSTOM: memblokir user yang ada di blacklist
# ============================================================
class BlacklistTree(app_commands.CommandTree):
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        data = load_blacklist()
        if str(interaction.user.id) in data:
            embed = discord.Embed(
                title="Akses Dibatasi",
                description="Akun Anda tercatat dalam daftar blacklist dan tidak dapat menggunakan bot ini.",
                color=WARNA_MERAH,
            )
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed, ephemeral=True)
            return False
        return True


intents = discord.Intents.default()
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents, tree_cls=BlacklistTree)


# ============================================================
#  HELPER
# ============================================================
def is_admin(member: discord.Member) -> bool:
    return member.guild_permissions.administrator


def is_perwira_tinggi(member: discord.Member) -> bool:
    return any(role.id == ROLE_PERWIRA_TINGGI for role in member.roles)


def embed_dasar(title: str, color: discord.Color = WARNA_UTAMA) -> discord.Embed:
    embed = discord.Embed(title=title, color=color)
    embed.set_footer(text=f"{NAMA_KOMUNITAS} • Asia Akpol Semarang Indonesia Academy")
    return embed


async def kirim_tolak(interaction: discord.Interaction, pesan: str) -> None:
    embed = discord.Embed(title="Akses Ditolak", description=pesan, color=WARNA_MERAH)
    await interaction.response.send_message(embed=embed, ephemeral=True)


# ============================================================
#  EVENT
# ============================================================
@bot.event
async def on_ready():
    if GUILD_ID:
        guild = discord.Object(id=int(GUILD_ID))
        bot.tree.copy_global_to(guild=guild)
        await bot.tree.sync(guild=guild)
    else:
        await bot.tree.sync()
    print(f"Bot online sebagai {bot.user} | {len(bot.guilds)} server")


# ============================================================
#  /pengumuman
# ============================================================
@bot.tree.command(name="pengumuman", description="Mengirim pengumuman resmi ke channel tertentu")
@app_commands.guild_only()
@app_commands.describe(
    channel="Channel tujuan pengumuman",
    isi="Isi pengumuman",
    lampiran1="Lampiran gambar pertama (opsional)",
    lampiran2="Lampiran gambar kedua (opsional)",
)
async def pengumuman(
    interaction: discord.Interaction,
    channel: discord.TextChannel,
    isi: str,
    lampiran1: Optional[discord.Attachment] = None,
    lampiran2: Optional[discord.Attachment] = None,
):
    if not is_admin(interaction.user):
        return await kirim_tolak(interaction, "Perintah ini hanya dapat digunakan oleh **Administrator**.")

    lampiran = [a for a in (lampiran1, lampiran2) if a is not None]
    if any(not (a.content_type or "").startswith("image/") for a in lampiran):
        return await kirim_tolak(interaction, "Lampiran harus berupa **gambar**.")

    await interaction.response.defer(ephemeral=True)

    embed_utama = discord.Embed(
        title="PENGUMUMAN RESMI",
        description=isi,
        color=WARNA_UTAMA,
        timestamp=discord.utils.utcnow(),
    )
    embed_utama.set_footer(text=f"Dikeluarkan oleh {interaction.user.display_name} • {NAMA_KOMUNITAS}")

    embeds = [embed_utama]
    for gambar in lampiran:
        embed_gambar = discord.Embed(color=WARNA_EMAS)
        embed_gambar.set_image(url=gambar.url)
        embeds.append(embed_gambar)

    await channel.send(embeds=embeds)

    sukses = discord.Embed(
        title="Pengumuman Terkirim",
        description=f"Pengumuman berhasil dikirim ke {channel.mention}.",
        color=WARNA_HIJAU,
    )
    await interaction.followup.send(embed=sukses, ephemeral=True)


# ============================================================
#  /blacklist-add
# ============================================================
@bot.tree.command(name="blacklist-add", description="Menambahkan pengguna ke daftar blacklist")
@app_commands.guild_only()
@app_commands.describe(
    nama="Nama pengguna",
    user_id="ID Discord pengguna",
    alasan="Alasan blacklist",
)
async def blacklist_add(interaction: discord.Interaction, nama: str, user_id: str, alasan: str):
    if not is_admin(interaction.user):
        return await kirim_tolak(interaction, "Perintah ini hanya dapat digunakan oleh **Administrator**.")

    user_id = user_id.strip()
    if not user_id.isdigit():
        return await kirim_tolak(interaction, "User ID harus berupa **angka**.")

    data = load_blacklist()
    if user_id in data:
        return await kirim_tolak(interaction, f"User ID `{user_id}` sudah terdaftar dalam blacklist.")

    data[user_id] = {
        "nama": nama,
        "alasan": alasan,
        "oleh": interaction.user.display_name,
    }
    save_blacklist(data)

    embed = embed_dasar("Blacklist Ditambahkan", WARNA_MERAH)
    embed.add_field(name="Nama", value=nama, inline=True)
    embed.add_field(name="User ID", value=f"`{user_id}`", inline=True)
    embed.add_field(name="Alasan", value=alasan, inline=False)
    embed.set_footer(text=f"Oleh {interaction.user.display_name} • {NAMA_KOMUNITAS}")
    await interaction.response.send_message(embed=embed)


# ============================================================
#  /blacklist-remove
# ============================================================
@bot.tree.command(name="blacklist-remove", description="Menghapus pengguna dari daftar blacklist")
@app_commands.guild_only()
@app_commands.describe(
    nama="Nama pengguna",
    user_id="ID Discord pengguna",
)
async def blacklist_remove(interaction: discord.Interaction, nama: str, user_id: str):
    if not is_admin(interaction.user):
        return await kirim_tolak(interaction, "Perintah ini hanya dapat digunakan oleh **Administrator**.")

    user_id = user_id.strip()
    data = load_blacklist()
    if user_id not in data:
        return await kirim_tolak(interaction, f"User ID `{user_id}` tidak ditemukan dalam blacklist.")

    del data[user_id]
    save_blacklist(data)

    embed = embed_dasar("Blacklist Dihapus", WARNA_HIJAU)
    embed.add_field(name="Nama", value=nama, inline=True)
    embed.add_field(name="User ID", value=f"`{user_id}`", inline=True)
    embed.set_footer(text=f"Oleh {interaction.user.display_name} • {NAMA_KOMUNITAS}")
    await interaction.response.send_message(embed=embed)


# ============================================================
#  /cekkhodam
# ============================================================
@bot.tree.command(name="cekkhodam", description="Mengecek khodam Anda")
async def cekkhodam(interaction: discord.Interaction):
    khodam = random.choice(DAFTAR_KHODAM)
    embed = embed_dasar("Hasil Pengecekan Khodam", WARNA_EMAS)
    embed.description = (
        f"**Pemilik:** {interaction.user.mention}\n\n"
        f"Khodam Anda adalah **{khodam}**."
    )
    embed.set_footer(text="Hanya untuk hiburan")
    await interaction.response.send_message(embed=embed)


# ============================================================
#  /absensi
# ============================================================
@bot.tree.command(name="absensi", description="Mengirim laporan absensi Perwira Tinggi")
@app_commands.guild_only()
@app_commands.describe(
    nama="Nama lengkap",
    pangkat="Pangkat",
    jabatan="Jabatan",
    laporan_ke="Ditujukan kepada",
    note="Catatan tambahan (opsional)",
)
async def absensi(
    interaction: discord.Interaction,
    nama: str,
    pangkat: str,
    jabatan: str,
    laporan_ke: str,
    note: str = "-",
):
    if not isinstance(interaction.user, discord.Member) or not is_perwira_tinggi(interaction.user):
        return await kirim_tolak(interaction, "Perintah ini hanya dapat digunakan oleh **Perwira Tinggi**.")

    embed = embed_dasar("LAPORAN ABSENSI PERWIRA TINGGI")
    embed.timestamp = discord.utils.utcnow()
    embed.add_field(name="Nama", value=nama, inline=False)
    embed.add_field(name="Pangkat", value=pangkat, inline=False)
    embed.add_field(name="Jabatan", value=jabatan, inline=False)
    embed.add_field(name="Laporan Ke", value=laporan_ke, inline=False)
    embed.add_field(name="Note", value=note, inline=False)
    embed.set_footer(text=f"Dikirim oleh {interaction.user.display_name} • {NAMA_KOMUNITAS}")

    await interaction.response.send_message(
        content=f"<@{PING_USER_ID}>",
        embed=embed,
        allowed_mentions=discord.AllowedMentions(users=[discord.Object(id=PING_USER_ID)]),
    )


# ============================================================
#  /serverinfo
# ============================================================
@bot.tree.command(name="serverinfo", description="Menampilkan informasi server")
@app_commands.guild_only()
async def serverinfo(interaction: discord.Interaction):
    guild = interaction.guild

    bots = sum(1 for m in guild.members if m.bot) if guild.members else 0
    total = guild.member_count or 0
    humans = total - bots

    embed = embed_dasar(guild.name)
    if guild.icon:
        embed.set_thumbnail(url=guild.icon.url)

    embed.add_field(name="Owner", value=guild.owner.mention if guild.owner else "-", inline=True)
    embed.add_field(name="Dibuat", value=discord.utils.format_dt(guild.created_at, "D"), inline=True)
    embed.add_field(name="Total Member", value=f"{total:,}", inline=True)
    embed.add_field(name="Member Manusia", value=f"{humans:,}", inline=True)
    embed.add_field(name="Bot", value=f"{bots:,}", inline=True)
    embed.add_field(name="Role", value=f"{len(guild.roles) - 1:,}", inline=True)
    embed.add_field(
        name="Channel",
        value=(
            f"Teks: {len(guild.text_channels)}\n"
            f"Suara: {len(guild.voice_channels)}\n"
            f"Kategori: {len(guild.categories)}"
        ),
        inline=True,
    )
    embed.add_field(
        name="Boost",
        value=f"Level {guild.premium_tier} • {guild.premium_subscription_count or 0} boost",
        inline=True,
    )
    embed.add_field(name="ID Server", value=f"`{guild.id}`", inline=False)

    await interaction.response.send_message(embed=embed)


# ============================================================
#  /userinfo
# ============================================================
@bot.tree.command(name="userinfo", description="Menampilkan informasi pengguna")
@app_commands.guild_only()
@app_commands.describe(member="Pengguna yang ingin dilihat (kosongkan untuk diri sendiri)")
async def userinfo(interaction: discord.Interaction, member: Optional[discord.Member] = None):
    member = member or interaction.user

    embed = embed_dasar(member.display_name)
    embed.set_thumbnail(url=member.display_avatar.url)

    embed.add_field(name="Username", value=str(member), inline=True)
    embed.add_field(name="ID", value=f"`{member.id}`", inline=True)
    embed.add_field(name="Bot", value="Ya" if member.bot else "Tidak", inline=True)
    embed.add_field(name="Akun Dibuat", value=discord.utils.format_dt(member.created_at, "D"), inline=True)
    embed.add_field(
        name="Bergabung ke Server",
        value=discord.utils.format_dt(member.joined_at, "D") if member.joined_at else "-",
        inline=True,
    )
    embed.add_field(name="Role Tertinggi", value=member.top_role.mention, inline=True)

    roles = [r.mention for r in reversed(member.roles) if r.id != interaction.guild.id]
    isi_role = " ".join(roles[:15]) if roles else "Tidak ada"
    if len(roles) > 15:
        isi_role += f" dan {len(roles) - 15} lainnya"
    embed.add_field(name=f"Role ({len(roles)})", value=isi_role, inline=False)

    await interaction.response.send_message(embed=embed)


# ============================================================
#  /ping-bot
# ============================================================
@bot.tree.command(name="ping-bot", description="Mengecek respon bot")
async def ping_bot(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)
    embed = embed_dasar("Status Bot", WARNA_HIJAU)
    embed.add_field(name="Latensi", value=f"{latency} ms", inline=True)
    embed.add_field(name="Status", value="Online", inline=True)
    await interaction.response.send_message(embed=embed)


# ============================================================
#  /help
# ============================================================
@bot.tree.command(name="help", description="Menampilkan informasi dan tautan komunitas")
async def help_cmd(interaction: discord.Interaction):
    embed = discord.Embed(color=WARNA_UTAMA)
    embed.description = (
        f"Ada yang kami bisa bantu?\n\n"
        f"Jika kamu belum join Komunitas Roblox **{NAMA_KOMUNITAS}**, silahkan join melalui link berikut:\n"
        f"**[LINK KOMUNITAS {NAMA_KOMUNITAS}]({LINK_KOMUNITAS})**\n\n"
        f"Jangan lupa join server **Ro-nation** kami:\n"
        f"**[LINK SERVER RO-NATION {NAMA_KOMUNITAS}]({LINK_RONATION})**\n\n"
        f"*Selamat bersenang-senang di Asia.*"
    )
    embed.set_footer(text=NAMA_KOMUNITAS)

    await interaction.response.send_message(
        content=f"<@{interaction.user.id}>",
        embed=embed,
    )


# ============================================================
#  RUN
# ============================================================
if not TOKEN:
    raise SystemExit("DISCORD_TOKEN belum diisi di environment variable.")

bot.run(TOKEN)
