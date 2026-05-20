/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create default user
    const defaultUser = await prisma.user.create({
      data: {
        firebaseUid: 'test-user-123',
      },
    });
    console.log('✅ Created default user:', defaultUser.id);

    // Create default board
    const defaultBoard = await prisma.board.create({
      data: {
        name: 'My First Board',
        ownerId: defaultUser.id,
      },
    });
    console.log('✅ Created default board:', defaultBoard.id);

    // Create default columns
    const columns = [
      { name: 'Backlog', position: 0 },
      { name: 'To Do', position: 1 },
      { name: 'In Progress', position: 2 },
      { name: 'Review', position: 3 },
      { name: 'Done', position: 4 },
    ];

    const createdColumns = await Promise.all(
      columns.map((column) =>
        prisma.column.create({
          data: {
            name: column.name,
            position: column.position,
            boardId: defaultBoard.id,
          },
        })
      )
    );
    console.log('✅ Created default columns:', createdColumns.length);

    // Create sample cards
    const sampleCards = [
      {
        title: 'Setup development environment',
        description: 'Install Node.js, create project, setup git',
        columnId: createdColumns[0].id, // Backlog
        boardId: defaultBoard.id,
        assigneeId: defaultUser.id,
        tags: ['setup', 'development'],
      },
      {
        title: 'Design database schema',
        description: 'Create Prisma schema with User, Board, Column, Card models',
        columnId: createdColumns[0].id, // Backlog
        boardId: defaultBoard.id,
        tags: ['database', 'design'],
      },
      {
        title: 'Implement authentication',
        description: 'Setup Firebase Auth with email/password and Google OAuth',
        columnId: createdColumns[1].id, // To Do
        boardId: defaultBoard.id,
        tags: ['auth', 'firebase'],
      },
      {
        title: 'Create board API routes',
        description: 'Implement CRUD operations for boards',
        columnId: createdColumns[1].id, // To Do
        boardId: defaultBoard.id,
        tags: ['api', 'backend'],
      },
      {
        title: 'Build board UI components',
        description: 'Create responsive board layout with drag and drop',
        columnId: createdColumns[2].id, // In Progress
        boardId: defaultBoard.id,
        assigneeId: defaultUser.id,
        tags: ['frontend', 'react', 'ui'],
      },
      {
        title: 'Implement card CRUD operations',
        description: 'Create API endpoints for card management',
        columnId: createdColumns[2].id, // In Progress
        boardId: defaultBoard.id,
        tags: ['api', 'backend'],
      },
      {
        title: 'Setup deployment pipeline',
        description: 'Configure Fly.io deployment with proper env variables',
        columnId: createdColumns[4].id, // Done
        boardId: defaultBoard.id,
        tags: ['deployment', 'devops'],
      },
    ];

    const createdCards = await prisma.card.createMany({
      data: sampleCards,
    });
    console.log('✅ Created sample cards:', createdCards.count);

    // Create sample OpenClaw agent configs
    const agentConfigs = [
      {
        name: 'Code Review Assistant',
        openClawId: 'claude-code-review',
        description: 'Reviews code for best practices and potential issues',
        model: 'claude-3-sonnet-20240229',
      },
      {
        name: 'Documentation Generator',
        openClawId: 'claude-docs',
        description: 'Generates documentation from code analysis',
        model: 'claude-3-haiku-20240307',
      },
      {
        name: 'Bug Hunter',
        openClawId: 'claude-bug-finder',
        description: 'Analyzes code for bugs and security vulnerabilities',
        model: 'claude-3-opus-20240229',
      },
      {
        name: 'Feature Request Handler',
        openClawId: 'claude-features',
        description: 'Helps plan and implement new features',
        model: 'claude-3-sonnet-20240229',
      },
    ];

    await prisma.agentConfig.createMany({
      data: agentConfigs,
    });
    console.log('✅ Created sample agent configs:', agentConfigs.length);

    // Create sample OpenClaw connection
    await prisma.openClawConnection.create({
      data: {
        gatewayUrl: 'https://api.openclaw.example.com',
        apiKey: 'sample-api-key-for-testing',
        enabled: true,
        boardId: defaultBoard.id,
      },
    });
    console.log('✅ Created sample OpenClaw connection');

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });