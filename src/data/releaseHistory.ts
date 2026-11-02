export interface ReleaseChange {
  type: 'added' | 'improved' | 'fixed';
  description: string;
}

export interface ReleaseRecord {
  version: string;
  releaseDate: string; // YYYY-MM-DD
  summary: string;
  changes: ReleaseChange[];
}

export const APP_VERSION = 'v2.5.0';

export const RELEASE_HISTORY: ReleaseRecord[] = [
  {
    version: 'v2.5.0',
    releaseDate: '2026-11-02',
    summary: 'Single-role Admin account structure, request-and-approval workflow, backend security rules, and in-app update history.',
    changes: [
      {
        type: 'added',
        description: 'New Admin Access Request workflow on the login page with full name, email, and password confirmation.',
      },
      {
        type: 'added',
        description: 'Dedicated Admin Access Requests management table with 1-click Approve and Reject actions.',
      },
      {
        type: 'added',
        description: 'Account audit log recording all access requests, approvals, rejections, and status modifications.',
      },
      {
        type: 'added',
        description: 'Settings → About and Settings → Update History sections displaying verified release history with Added, Improved, and Fixed categories.',
      },
      {
        type: 'added',
        description: 'Dismissible "What’s new" notification modal shown once per version to approved Admins.',
      },
      {
        type: 'improved',
        description: 'Unified account model: every approved account is an Admin with identical full ERP permissions.',
      },
      {
        type: 'improved',
        description: 'Updated login page to match the approved luxury living room visual design with clean Email and Password fields.',
      },
      {
        type: 'improved',
        description: 'Backend security enforcement: pending or rejected accounts cannot access protected ERP records in Firestore.',
      },
      {
        type: 'fixed',
        description: 'Enforced last-Admin protection preventing deletion or suspension of the final active Admin account.',
      },
      {
        type: 'fixed',
        description: 'Removed legacy Employee, Manager, Staff, Sales, and Viewer role selectors from all interfaces.',
      },
    ],
  },
  {
    version: 'v2.4.0',
    releaseDate: '2026-11-02',
    summary: 'Custom subdomain erp.shoukhinhd.com launch, 111 real products and 1,731 Steadfast orders integration.',
    changes: [
      {
        type: 'added',
        description: 'Verified business data loader containing 111 real decor items with purchase cost and selling prices.',
      },
      {
        type: 'added',
        description: 'Integration of 1,731 Steadfast customer orders with full consignment tracking codes.',
      },
      {
        type: 'improved',
        description: 'Subdomain routing and SSL certificates for erp.shoukhinhd.com.',
      },
      {
        type: 'fixed',
        description: 'Resolved state reset bug on owner login so real product inventory is displayed immediately.',
      },
    ],
  },
];
