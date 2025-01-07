import { createRPCClient } from '../rpc.client'
import type { ServerRPCMethods } from './methods'

// Create and export the RPC client using the inferred type
export const rpc = createRPCClient<ServerRPCMethods>({
	url: '/api/rpc'
	// Add any other options like credentials or getHeaders if needed
})
