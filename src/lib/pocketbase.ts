import PocketBase from 'pocketbase'

// Use same-origin proxy via nginx — no CORS, works from any browser
const pb = new PocketBase(window.location.origin)

export default pb
