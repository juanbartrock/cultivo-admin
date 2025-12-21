/**
 * Script de migración a sistema multiusuario
 * 
 * Este script:
 * 1. Crea el usuario admin si no existe
 * 2. Asocia todos los datos existentes (rooms, cycles, devices, etc.) al admin
 * 3. NO BORRA ningún dato existente
 * 
 * Ejecutar con: npx ts-node scripts/migrate-to-multiuser.ts
 */

import { PrismaClient, UserRole, SubscriptionTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('Migración a Sistema Multiusuario');
  console.log('='.repeat(60));
  console.log('');

  // 1. Crear o encontrar el usuario admin
  console.log('1. Buscando/creando usuario admin...');
  
  let adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'admin' },
        { role: UserRole.ADMIN },
      ],
    },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        supabaseId: 'local-admin',
        email: 'admin',
        name: 'Administrador',
        role: UserRole.ADMIN,
        subscriptionTier: SubscriptionTier.PREMIUM,
        isActive: true,
      },
    });
    console.log(`   ✓ Usuario admin creado con ID: ${adminUser.id}`);
  } else {
    // Asegurar que tiene rol ADMIN y suscripción PREMIUM
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        role: UserRole.ADMIN,
        subscriptionTier: SubscriptionTier.PREMIUM,
      },
    });
    console.log(`   ✓ Usuario admin existente: ${adminUser.id}`);
  }

  const adminId = adminUser.id;

  // 2. Migrar Rooms
  console.log('');
  console.log('2. Migrando salas (rooms)...');
  const roomsWithoutUser = await prisma.room.findMany({
    where: { userId: null },
  });
  
  if (roomsWithoutUser.length > 0) {
    await prisma.room.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${roomsWithoutUser.length} sala(s) asociadas al admin`);
  } else {
    console.log('   - No hay salas sin usuario');
  }

  // 3. Migrar Devices
  console.log('');
  console.log('3. Migrando dispositivos...');
  const devicesWithoutUser = await prisma.device.findMany({
    where: { userId: null },
  });
  
  if (devicesWithoutUser.length > 0) {
    await prisma.device.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${devicesWithoutUser.length} dispositivo(s) asociados al admin`);
  } else {
    console.log('   - No hay dispositivos sin usuario');
  }

  // 4. Migrar Cycles
  console.log('');
  console.log('4. Migrando ciclos...');
  const cyclesWithoutUser = await prisma.cycle.findMany({
    where: { userId: null },
  });
  
  if (cyclesWithoutUser.length > 0) {
    await prisma.cycle.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${cyclesWithoutUser.length} ciclo(s) asociados al admin`);
  } else {
    console.log('   - No hay ciclos sin usuario');
  }

  // 5. Migrar Strains
  console.log('');
  console.log('5. Migrando genéticas...');
  const strainsWithoutUser = await prisma.strain.findMany({
    where: { userId: null },
  });
  
  if (strainsWithoutUser.length > 0) {
    await prisma.strain.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${strainsWithoutUser.length} genética(s) asociadas al admin`);
  } else {
    console.log('   - No hay genéticas sin usuario');
  }

  // 6. Migrar FeedingPlans
  console.log('');
  console.log('6. Migrando planes de alimentación...');
  const feedingPlansWithoutUser = await prisma.feedingPlan.findMany({
    where: { userId: null },
  });
  
  if (feedingPlansWithoutUser.length > 0) {
    await prisma.feedingPlan.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${feedingPlansWithoutUser.length} plan(es) de alimentación asociados al admin`);
  } else {
    console.log('   - No hay planes de alimentación sin usuario');
  }

  // 7. Migrar PreventionPlans
  console.log('');
  console.log('7. Migrando planes de prevención...');
  const preventionPlansWithoutUser = await prisma.preventionPlan.findMany({
    where: { userId: null },
  });
  
  if (preventionPlansWithoutUser.length > 0) {
    await prisma.preventionPlan.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${preventionPlansWithoutUser.length} plan(es) de prevención asociados al admin`);
  } else {
    console.log('   - No hay planes de prevención sin usuario');
  }

  // 8. Migrar AIConversations
  console.log('');
  console.log('8. Migrando conversaciones de IA...');
  const conversationsWithoutUser = await prisma.aIConversation.findMany({
    where: { userId: null },
  });
  
  if (conversationsWithoutUser.length > 0) {
    await prisma.aIConversation.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${conversationsWithoutUser.length} conversación(es) asociadas al admin`);
  } else {
    console.log('   - No hay conversaciones sin usuario');
  }

  // 9. Migrar AIMemories
  console.log('');
  console.log('9. Migrando memorias de IA...');
  const memoriesWithoutUser = await prisma.aIMemory.findMany({
    where: { userId: null },
  });
  
  if (memoriesWithoutUser.length > 0) {
    await prisma.aIMemory.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${memoriesWithoutUser.length} memoria(s) asociadas al admin`);
  } else {
    console.log('   - No hay memorias sin usuario');
  }

  // 10. Migrar Notifications
  console.log('');
  console.log('10. Migrando notificaciones...');
  const notificationsWithoutUser = await prisma.notification.findMany({
    where: { userId: null },
  });
  
  if (notificationsWithoutUser.length > 0) {
    await prisma.notification.updateMany({
      where: { userId: null },
      data: { userId: adminId },
    });
    console.log(`   ✓ ${notificationsWithoutUser.length} notificación(es) asociadas al admin`);
  } else {
    console.log('   - No hay notificaciones sin usuario');
  }

  // Resumen final
  console.log('');
  console.log('='.repeat(60));
  console.log('Migración completada exitosamente');
  console.log('='.repeat(60));
  console.log('');
  console.log('Resumen:');
  console.log(`  - Usuario admin: ${adminUser.email} (${adminUser.id})`);
  console.log(`  - Rol: ${adminUser.role}`);
  console.log(`  - Suscripción: ${adminUser.subscriptionTier}`);
  console.log('');
  console.log('Todos los datos existentes han sido asociados al usuario admin.');
  console.log('Los nuevos usuarios que se registren tendrán sus propios datos aislados.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




