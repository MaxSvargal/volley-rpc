import { createRPCServer } from '../rpc.server'
import { json } from '@sveltejs/kit'
import { RPCContext, methods } from './methods'
import type { RequestHandler } from '@sveltejs/kit'

// Create the RPC server
export const rpcServer = createRPCServer<RPCContext>(methods)

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json()
		// Extract session information from the request
		const context: RPCContext = {
			session: {
				userId: (locals as { userId: string }).userId // Assuming you set this in your hooks
				// Extract other session information as needed
			}
		}

		try {
			const result = await rpcServer.handle(body, context)
			if ('error' in result || (Array.isArray(result) && result.some((r) => 'error' in r)))
				console.error(result)
			return json(result)
		} catch (error) {
			console.error(error)
			return json(
				{ jsonrpc: '2.0', code: -32603, error: { message: String(error) }, id: body.id },
				{ status: 500 }
			)
		}
	} catch (error) {
		console.error(error)
		return json(
			{ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
			{ status: 500 }
		)
	}
}
