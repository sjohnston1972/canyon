// Easter egg: Adri gets a joke "Inflatable Unicorn" treatment (a 🦄 avatar, and pride of
// place on the Boats manifest). Display-only — never a boats/boat_choices record, so it
// never touches any stat, and her real data is unchanged. Single source of truth so the
// Boats and Team pages stay in sync.
export const UNICORN_MEMBER_ID = '15v1u62nja4rzk4'

export const isUnicornPaddler = (m: { id: string; first_name?: string; last_name?: string }) =>
  m.id === UNICORN_MEMBER_ID || /adrif|yelgis/i.test(`${m.first_name ?? ''}${m.last_name ?? ''}`)
