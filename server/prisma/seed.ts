import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Treasure Hunt database with 10 Cryptic Campus Checkpoints...');

  // 1. Seed Admin User
  const adminPasswordHash = await bcrypt.hash('1christian#', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`👤 Admin user ready: ${admin.username} (Password: 1christian#)`);

  // 2. Seed Game Settings
  await prisma.gameSettings.upsert({
    where: { id: 'default' },
    update: {
      huntTitle: 'The Sovereign Odyssey — 10 Checkpoint Enigma',
      huntDescription:
        'Decipher cryptic location clues, navigate secret campus landmarks, scan hidden QR checkpoints, and solve the ancient riddles to conquer the hunt!',
    },
    create: {
      id: 'default',
      huntTitle: 'The Sovereign Odyssey — 10 Checkpoint Enigma',
      huntDescription:
        'Decipher cryptic location clues, navigate secret campus landmarks, scan hidden QR checkpoints, and solve the ancient riddles to conquer the hunt!',
      isHuntActive: true,
      requireFullscreen: false,
      allowAudioSFX: true,
      autoApproveDevice: false,
    },
  });

  // 3. Clear existing questions & records
  await prisma.unlockedKey.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.securityLog.deleteMany();
  await prisma.deviceSession.deleteMany();
  await prisma.question.deleteMany();

  // 4. Seed the 10 Campus Checkpoints with Cryptic Clues (NO direct location names in hints)
  const checkpoints = [
    {
      level: 1,
      locationName: 'Lotus Pond',
      title: 'The Whispering Waters',
      questionType: 'TEXT',
      questionContent:
        'Born in the depths of muddy waters yet rising pure and unblemished, I open my sacred petals to greet the morning sun and close as twilight falls. What revered aquatic flower am I?',
      questionMediaUrl: null,
      correctAnswer: 'Lotus|Lotus Flower|Nelumbo',
      locationHintType: 'TEXT',
      locationHintContent:
        'Seek the tranquil aquatic oasis where green floating pads rest upon still waters and morning petals open in silence. Search the wooden railing post beside the water\'s edge.',
      locationHintMediaUrl: null,
      accessKey: 'LP9X2A',
      qrIdentifier: 'QR-LOC1-LOTUS-POND',
      isActive: true,
    },
    {
      level: 2,
      locationName: 'Broken Car near Library',
      title: 'The Frozen Engine',
      questionType: 'TEXT',
      questionContent:
        'I possess four wheels yet traverse no roads; my iron engine is cold and silent. Once a master of velocity, now a still relic resting in the shadows of literature. What machine am I?',
      questionMediaUrl: null,
      correctAnswer: 'Car|Automobile|Vehicle|Vintage Car|Broken Car',
      locationHintType: 'TEXT',
      locationHintContent:
        'Tucked in the shaded gravel yard behind the colossal sanctuary of silent readers rests a forgotten chariot of iron and four wheels that shall journey no more. Inspect the shaded trees beside it.',
      locationHintMediaUrl: null,
      accessKey: 'BC4M8K',
      qrIdentifier: 'QR-LOC2-BROKEN-CAR',
      isActive: true,
    },
    {
      level: 3,
      locationName: 'Digital Library Exterior',
      title: 'The Silicon Codex',
      questionType: 'TEXT',
      questionContent:
        'I house millions of volumes yet occupy zero physical shelf space. I speak in binary streams of 0s and 1s and beam knowledge at the speed of light. What modern repository am I?',
      questionMediaUrl: null,
      correctAnswer: 'Digital Library|E-Library|Electronic Library|Server|Cloud',
      locationHintType: 'TEXT',
      locationHintContent:
        'Where physical bookshelves give way to high-speed fiber optics, glowing monitors, and infinite virtual knowledge. Search the exterior concrete pillars flanking the entrance.',
      locationHintMediaUrl: null,
      accessKey: 'DL7R3Q',
      qrIdentifier: 'QR-LOC3-DIGITAL-LIB',
      isActive: true,
    },
    {
      level: 4,
      locationName: 'Civil Workshop Exterior',
      title: "The Master Builder's Truss",
      questionType: 'TEXT',
      questionContent:
        'I am the fundamental geometric polygon that gives steel bridges and architectural trusses their unyielding rigidity because my angles cannot distort without changing side lengths. What three-sided shape am I?',
      questionMediaUrl: null,
      correctAnswer: 'Triangle|Truss|Triangular',
      locationHintType: 'TEXT',
      locationHintContent:
        'Head towards the heavy industrial yard where concrete cures, steel rebar is tested, and the foundation blueprints of towering structures are drafted. Search the shaded exterior perimeter wall.',
      locationHintMediaUrl: null,
      accessKey: 'CW5T1N',
      qrIdentifier: 'QR-LOC4-CIVIL-SHOP',
      isActive: true,
    },
    {
      level: 5,
      locationName: 'Principle Office',
      title: 'The Helm of Governance',
      questionType: 'TEXT',
      questionContent:
        'Under my roof, executive decrees receive their official seal. The vision, integrity, and leadership of the entire campus are steered from this chamber. Whose office am I?',
      questionMediaUrl: null,
      correctAnswer: "Principal Office|Principal's Office|Principal|Director Office|Dean Office",
      locationHintType: 'TEXT',
      locationHintContent:
        'Journey to the administrative summit of the institution where executive decrees are signed and institutional leadership presides. Find the checkpoint badge along the executive corridor.',
      locationHintMediaUrl: null,
      accessKey: 'PO8B6V',
      qrIdentifier: 'QR-LOC5-PRINCIPAL-OFFICE',
      isActive: true,
    },
    {
      level: 6,
      locationName: 'College Main Gate',
      title: 'The Grand Portal',
      questionType: 'TEXT',
      questionContent:
        'Thousands cross beneath my colossal arch every dawn seeking wisdom, and thousands depart as dusk falls. I stand as the guardian boundary between campus and the outer world. What am I?',
      questionMediaUrl: null,
      correctAnswer: 'Main Gate|College Main Gate|Gate|Entrance|Arch',
      locationHintType: 'TEXT',
      locationHintContent:
        'Where every dawn welcomes thousands of aspiring scholars and dusk bids them farewell into the outer city. Look beside the towering stone gateway columns guarding the perimeter.',
      locationHintMediaUrl: null,
      accessKey: 'MG3H7Z',
      qrIdentifier: 'QR-LOC6-MAIN-GATE',
      isActive: true,
    },
    {
      level: 7,
      locationName: 'Electrical Workshop Exterior',
      title: 'The Spark of Faraday',
      questionType: 'TEXT',
      questionContent:
        'Measured in Volts and propelled by Amperes, I rush through copper pathways to breathe life into dynamos, microchips, and glowing power grids. What invisible energy am I?',
      questionMediaUrl: null,
      correctAnswer: 'Electricity|Electric Current|Voltage|Current|Electric Power',
      locationHintType: 'TEXT',
      locationHintContent:
        'Where the low hum of transformers, alternators, and high-voltage conduits echoes behind caution markings. Search the outer perimeter railing near the power lab doorway.',
      locationHintMediaUrl: null,
      accessKey: 'EW6J9D',
      qrIdentifier: 'QR-LOC7-ELEC-SHOP',
      isActive: true,
    },
    {
      level: 8,
      locationName: 'CS & EC Dept Exterior Border',
      title: 'The Silicon Crossroads',
      questionType: 'TEXT',
      questionContent:
        'Where algorithmic lines of logic and code shake hands with integrated circuits, microprocessors, and electromagnetic waves. What two foundational engineering branches meet at this border?',
      questionMediaUrl: null,
      correctAnswer:
        'Computer Science and Electronics|CS and EC|CSE and ECE|CS & EC|Electronics and Computer Science',
      locationHintType: 'TEXT',
      locationHintContent:
        'At the outdoor crossroads where the domain of software algorithms meets the realm of silicon microchips and signal transmitters. Inspect the directional pathway sign at the departmental border.',
      locationHintMediaUrl: null,
      accessKey: 'CE2K5W',
      qrIdentifier: 'QR-LOC8-CS-EC-BORDER',
      isActive: true,
    },
    {
      level: 9,
      locationName: 'First Year Block Exterior',
      title: 'The Genesis Threshold',
      questionType: 'TEXT',
      questionContent:
        'Every scholar, engineer, and gold medalist once stood on these steps as a newcomer with a blank notebook and big ambitions. Where does collegiate life begin?',
      questionMediaUrl: null,
      correctAnswer: 'First Year Block|First Year|1st Year Block|Freshers Block|Foundation',
      locationHintType: 'TEXT',
      locationHintContent:
        'Where every aspiring engineer and scholar takes their very first steps into collegiate life with fresh notebooks and foundational lectures. Check the garden steps leading up to the freshmen entrance.',
      locationHintMediaUrl: null,
      accessKey: 'FY1S8Y',
      qrIdentifier: 'QR-LOC9-FIRST-YEAR',
      isActive: true,
    },
    {
      level: 10,
      locationName: 'Auditorium',
      title: 'The Grand Amphitheater',
      questionType: 'TEXT',
      questionContent:
        'The grand stage where spotlights ignite, acoustic sound reverberates, and hundreds gather in union to witness performances, speeches, and triumphs. What grand hall am I?',
      questionMediaUrl: null,
      correctAnswer: 'Auditorium|Audi|Amphitheater|Stage|Theater|Hall',
      locationHintType: 'TEXT',
      locationHintContent:
        'The grand architectural theater of dazzling spotlights, soaring acoustic ceilings, and thousands roaring in applause during cultural fests. Scan the checkpoint badge at the grand entrance doors.',
      locationHintMediaUrl: null,
      accessKey: 'AU9P4E',
      qrIdentifier: 'QR-LOC10-AUDITORIUM',
      isActive: true,
    },
  ];

  for (const cp of checkpoints) {
    await prisma.question.create({ data: cp });
  }
  console.log(`🗺️  Seeded ${checkpoints.length} campus checkpoint locations with cryptic clues.`);

  // 5. Seed Demo Teams with Distinct Starting Points
  const team1Pass = await bcrypt.hash('alpha123', 10);
  const team2Pass = await bcrypt.hash('galleon123', 10);
  const team3Pass = await bcrypt.hash('phoenix123', 10);
  const team4Pass = await bcrypt.hash('titan123', 10);

  await prisma.team.deleteMany();

  const teams = [
    {
      teamName: 'Team Alpha Pioneers',
      teamCode: 'ALPHA',
      passwordHash: team1Pass,
      startLevel: 1, // Starts at Station 1
      currentLevel: 1,
      status: 'PENDING_APPROVAL',
    },
    {
      teamName: 'The Golden Galleon',
      teamCode: 'GALLEON',
      passwordHash: team2Pass,
      startLevel: 4, // Starts at Station 4
      currentLevel: 1,
      status: 'PENDING_APPROVAL',
    },
    {
      teamName: 'Phoenix Seekers',
      teamCode: 'PHOENIX',
      passwordHash: team3Pass,
      startLevel: 7, // Starts at Station 7
      currentLevel: 1,
      status: 'PENDING_APPROVAL',
    },
    {
      teamName: 'Titan Vanguard',
      teamCode: 'TITAN',
      passwordHash: team4Pass,
      startLevel: 10, // Starts at Station 10
      currentLevel: 1,
      status: 'PENDING_APPROVAL',
    },
  ];

  for (const t of teams) {
    await prisma.team.create({ data: t });
  }
  console.log(`👥 Seeded ${teams.length} participant teams with distributed starting checkpoints.`);
  console.log('✅ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
