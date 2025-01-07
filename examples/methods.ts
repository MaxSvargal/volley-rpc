import type { RPCMethodMap } from '../rpc.common'

export type RPCContext = {
	session: {
		userId: string
	}
}

export const methods = {
	getMyData: async (context: RPCContext, arg1: string, arg2: number) => {
		return { result: `Data for ${arg1} and ${arg2}, user: ${context.session.userId}` }
	}
} satisfies RPCMethodMap<RPCContext>

export type ServerRPCMethods = typeof methods
