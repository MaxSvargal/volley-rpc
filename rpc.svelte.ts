import { json } from '@sveltejs/kit'
import type { createRPCServer } from './rpc.server'
import type { RequestHandler } from '@sveltejs/kit'
import { logger } from '~/src'

export const svelteHandler =
	<C>(rpcServer: ReturnType<typeof createRPCServer<C>>, context: C): RequestHandler =>
	async ({ request }) => {
		try {
			const body = await request.json()
			try {
				const result = await rpcServer.handle(body, context)
				if ('error' in result || (Array.isArray(result) && result.some((r) => 'error' in r)))
					logger.error(result)
				return json(result)
			} catch (error) {
				logger.error(error)
				return json(
					{ jsonrpc: '2.0', code: -32603, error: { message: String(error) }, id: body.id },
					{ status: 500 }
				)
			}
		} catch (error) {
			logger.error(error)
			return json(
				{ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
				{ status: 500 }
			)
		}
	}
