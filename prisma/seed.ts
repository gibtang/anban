import {
  users,
  boards,
  columns,
  cards,
  agentConfigs,
  openClawConnections,
  getMongoDb,
  toId,
} from '../lib/db/mongo';

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Create default user
    const defaultUserId = await users.insertOne({
      firebaseUid: 'test-user-123',
      email: null,
      shareToken: null,
      onboardingCompleted: false,
      lastFeedSeenAt: null,
      createdAt: new Date(),
    });
    console.log('✅ Created default user:', defaultUserId);

    // Create default board
    const now = new Date();
    const defaultBoardId = await boards.insertOne({
      name: 'My First Board',
      description: null,
      ownerId: toId(defaultUserId),
      favorited: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log('✅ Created default board:', defaultBoardId);

    // Create default columns
    const columnDefs = [
      { name: 'Backlog', position: 0 },
      { name: 'To Do', position: 1 },
      { name: 'In Progress', position: 2 },
      { name: 'Review', position: 3 },
      { name: 'Done', position: 4 },
    ];

    const createdColumnIds = await Promise.all(
      columnDefs.map((column) =>
        columns.insertOne({
          name: column.name,
          position: column.position,
          boardId: toId(defaultBoardId),
          createdAt: new Date(),
        })
      )
    );
    console.log('✅ Created default columns:', createdColumnIds.length);

    // Create sample cards
    const sampleCards = [
      {
        title: 'Setup development environment',
        description: 'Install Node.js, create project, setup git',
        columnId: createdColumnIds[0], // Backlog
        boardId: defaultBoardId,
        tags: ['setup', 'development'],
      },
      {
        title: 'Design database schema',
        description: 'Create Prisma schema with User, Board, Column, Card models',
        columnId: createdColumnIds[0], // Backlog
        boardId: defaultBoardId,
        tags: ['database', 'design'],
      },
      {
        title: 'Implement authentication',
        description: 'Setup Firebase Auth with email/password and Google OAuth',
        columnId: createdColumnIds[1], // To Do
        boardId: defaultBoardId,
        tags: ['auth', 'firebase'],
      },
      {
        title: 'Create board API routes',
        description: 'Implement CRUD operations for boards',
        columnId: createdColumnIds[1], // To Do
        boardId: defaultBoardId,
        tags: ['api', 'backend'],
      },
      {
        title: 'Build board UI components',
        description: 'Create responsive board layout with drag and drop',
        columnId: createdColumnIds[2], // In Progress
        boardId: defaultBoardId,
        tags: ['frontend', 'react', 'ui'],
      },
      {
        title: 'Implement card CRUD operations',
        description: 'Create API endpoints for card management',
        columnId: createdColumnIds[2], // In Progress
        boardId: defaultBoardId,
        tags: ['api', 'backend'],
      },
      {
        title: 'Setup deployment pipeline',
        description: 'Configure Fly.io deployment with proper env variables',
        columnId: createdColumnIds[4], // Done
        boardId: defaultBoardId,
        tags: ['deployment', 'devops'],
      },
    ];

    const cardNow = new Date();
    for (const card of sampleCards) {
      await cards.insertOne({
        title: card.title,
        description: card.description,
        position: 0,
        columnId: toId(card.columnId),
        boardId: toId(card.boardId),
        tags: card.tags,
        agentId: null,
        blocked: null,
        archived: false,
        createdAt: cardNow,
        updatedAt: cardNow,
      });
    }
    console.log('✅ Created sample cards:', sampleCards.length);

    // Create sample OpenClaw agent configs
    const agentConfigDefs = [
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

    for (const config of agentConfigDefs) {
      await agentConfigs.insertOne({
        name: config.name,
        openClawId: config.openClawId,
        description: config.description,
        model: config.model,
        enabled: true,
        ownerId: toId(defaultUserId),
      });
    }
    console.log('✅ Created sample agent configs:', agentConfigDefs.length);

    // Create sample OpenClaw connection
    await openClawConnections.insertOne({
      gatewayUrl: 'https://api.openclaw.example.com',
      apiKey: 'sample-api-key-for-testing',
      enabled: true,
      boardId: toId(defaultBoardId),
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
    await getMongoDb().client.close();
  });
