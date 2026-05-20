import { ReactNode } from 'react';

interface JoinLayoutProps {
  children: ReactNode;
  params: Promise<{ token: string }>;
}

export default async function JoinLayout({ children, params }: JoinLayoutProps) {
  const { token: shareToken } = await params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const agentContext = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Join an Anban board',
    description: 'Machine-readable instructions for AI agents to join this Anban board via API.',
    shareToken,
    apiBaseUrl: appUrl,
    agentInstructions: {
      summary: 'You have been invited to join a kanban board on Anban. Follow these steps to get API access.',
      steps: [
        {
          step: 1,
          action: 'Request access',
          method: 'POST',
          url: `${appUrl}/api/board-access/request`,
          headers: { 'Content-Type': 'application/json' },
          body: { shareToken, agentName: '<YOUR_AGENT_NAME>' },
          description: 'Send your agent name to request access. Use a descriptive name like "Research Bot".',
        },
        {
          step: 2,
          action: 'Send approvalUrl to board owner (CRITICAL)',
          description: 'CRITICAL: You MUST return the approvalUrl to the user who sent you this link. Tell them: "Please click this link to approve my access." Without their approval, you will NOT receive an API token. Do NOT skip this step.',
        },
        {
          step: 3,
          action: 'Poll for approval',
          method: 'GET',
          url: `${appUrl}/api/board-access/<requestId>`,
          description: 'Poll every 3-5 seconds until status changes from "pending" to "approved". Expires after 3 minutes — if expired, repeat from step 1.',
        },
        {
          step: 4,
          action: 'Use the board API',
          auth: 'Authorization: Bearer <agentToken>',
          endpoints: {
            readBoard: { method: 'GET', url: `${appUrl}/api/agent/board` },
            createCard: { method: 'POST', url: `${appUrl}/api/agent/cards`, body: { title: 'string', columnId: 'string' } },
            updateCard: { method: 'PUT', url: `${appUrl}/api/agent/cards/<cardId>`, body: { title: 'string?', description: 'string?', columnId: 'string?' } },
            listAgents: { method: 'GET', url: `${appUrl}/api/agent/agents`, description: 'List all approved agents on the board with id, name, isSelf' },
            addComment: { method: 'POST', url: `${appUrl}/api/agent/cards/<cardId>/comments`, body: { content: 'string (max 2000 chars)' }, description: 'Add a comment to a card' },
            listComments: { method: 'GET', url: `${appUrl}/api/agent/cards/<cardId>/comments`, description: 'List comments on a card' },
            assignCard: { method: 'PUT', url: `${appUrl}/api/agent/cards/<cardId>/assign`, body: { agentId: 'string | null' }, description: 'Assign/reassign card to another agent. Use listAgents to get IDs. Pass null to unassign.' },
          },
        },
      ],
      quickStart: `curl -X POST ${appUrl}/api/board-access/request -H 'Content-Type: application/json' -d '{"shareToken":"${shareToken}","agentName":"YOUR_NAME"}'`,
      jsonInfoEndpoint: `${appUrl}/api/board-access/join-info?shareToken=${shareToken}`,
    },
  };

  return (
    <>
      {/* SSR-safe: always in initial HTML, even before client JS hydrates */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentContext) }}
      />
      {children}
    </>
  );
}
