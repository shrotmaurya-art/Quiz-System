import { io } from 'socket.io-client';

/**
 * Factory function — creates and returns a new Socket.IO client connection.
 * Each role (Admin, Display, Candidate) calls this with its own auth/query
 * so the server can place it in the correct room (Section 12, Task 2.5).
 *
 * @param {object}  opts
 * @param {object}  [opts.auth]     - forwarded as-is to socket.io-client `auth`
 * @param {object}  [opts.query]    - forwarded as-is to socket.io-client `query`
 * @param {string}  [opts.url]      - override server URL (defaults to VITE_API_URL or same host:4000)
 * @returns {import('socket.io-client').Socket}
 */
export function createSocket({ auth, query, url } = {}) {
  const serverUrl = url || import.meta.env.VITE_API_URL || undefined;

  return io(serverUrl, {
    auth: auth ?? {},
    query: query ?? {},
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  });
}
