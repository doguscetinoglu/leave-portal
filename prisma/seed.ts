import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);

  const manager = await prisma.user.upsert({
    where: { email: "yonetici@sirket.com" },
    update: {},
    create: {
      email: "yonetici@sirket.com",
      name: "Ahmet Yıldız",
      password: hashedPassword,
      role: "MANAGER",
      department: "Yazılım Geliştirme",
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email: "mehmet@sirket.com" },
    update: {},
    create: {
      email: "mehmet@sirket.com",
      name: "Mehmet Demir",
      password: hashedPassword,
      role: "EMPLOYEE",
      department: "Yazılım Geliştirme",
      managerId: manager.id,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: "ayse@sirket.com" },
    update: {},
    create: {
      email: "ayse@sirket.com",
      name: "Ayşe Kaya",
      password: hashedPassword,
      role: "EMPLOYEE",
      department: "İnsan Kaynakları",
      managerId: manager.id,
    },
  });

  const year = new Date().getFullYear();
  for (const userId of [manager.id, emp1.id, emp2.id]) {
    await prisma.leaveBalance.upsert({
      where: { userId_year_leaveType: { userId, year, leaveType: "ANNUAL" } },
      update: {},
      create: { userId, year, leaveType: "ANNUAL", totalDays: 20, usedDays: 0 },
    });
    await prisma.leaveBalance.upsert({
      where: { userId_year_leaveType: { userId, year, leaveType: "SICK" } },
      update: {},
      create: { userId, year, leaveType: "SICK", totalDays: 5, usedDays: 0 },
    });
  }

  await prisma.announcement.upsert({
    where: { id: "ann-1" },
    update: {},
    create: {
      id: "ann-1",
      title: "Yaz mesaisi eğitimi — 15 Haziran",
      content: "Yaz dönemi için mesai ve izin politikası toplantısı yapılacaktır.",
    },
  });
  await prisma.announcement.upsert({
    where: { id: "ann-2" },
    update: {},
    create: {
      id: "ann-2",
      title: "Sağlık sigortası yenileme",
      content: "Sağlık sigortası yenileme formları İK'ya teslim edilmelidir.",
    },
  });

  console.log("Seed tamamlandı:");
  console.log("  Yönetici: yonetici@sirket.com / 123456");
  console.log("  Çalışan 1: mehmet@sirket.com / 123456");
  console.log("  Çalışan 2: ayse@sirket.com / 123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
