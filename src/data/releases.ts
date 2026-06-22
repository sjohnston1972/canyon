// Release notes shown in the full-screen "New Features" announcement.
//
// HOW IT WORKS: bump CURRENT_RELEASE whenever you ship significant features and add a
// matching entry at the top of RELEASES. Every user (on every device) whose stored
// "last seen" version is older than CURRENT_RELEASE gets the announcement again — so a
// bump guarantees the whole team sees what changed, even if they previously dismissed it.

export interface ReleaseFeature {
  icon: string // Material Symbols name
  title: string
  body: string
  route?: string // optional in-app path the feature lives at
}

export interface Release {
  version: string // bump this string to re-trigger the announcement
  date: string // human-readable
  headline: string
  features: ReleaseFeature[]
}

// The version users must have seen to suppress the announcement.
// Keep this equal to RELEASES[0].version.
export const CURRENT_RELEASE = '2026-06-20'

export const RELEASES: Release[] = [
  {
    version: '2026-06-20',
    date: 'June 2026',
    headline: 'Two new tools just landed',
    features: [
      {
        icon: 'backpack',
        title: 'Build your own personal kit list',
        body:
          'The Gear page now has a Personal Kit tab. Pick your name, then add gear from the outfitter catalogue (prices included) or add your own custom items. It keeps a running tally of your personal expense for the trip. Items already covered by the trip fee (Full Rig, Complete Kitchen, Whole Shabang, Toilet System) are listed separately so you know what you do NOT need to buy.',
        route: '/gear',
      },
      {
        icon: 'upload_file',
        title: 'Import receipts & statements into the ledger',
        body:
          'On the Finances page, the Ledger now has an Import button. Upload a bank statement, receipt, or transaction list — as a TXT, CSV, photo, or PDF — and the assistant reads it and proposes ledger entries. Review and tick the ones you want, then commit. Nothing is saved until you confirm, and non-GBP rows convert at the live rate.',
        route: '/finances',
      },
    ],
  },
]
