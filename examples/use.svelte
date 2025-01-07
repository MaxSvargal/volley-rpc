<script lang="ts">
	import { rpc } from './client'

	async function fetchData() {
		try {
			const result = await rpc.getMyData('test', 123)
			console.log('Single call result:', result)
		} catch (error) {
			console.error('RPC call failed:', error)
		}
	}

	async function batchFetchData() {
		try {
			const results = await Promise.all([rpc.getMyData('test1', 123), rpc.getMyData('test2', 456)])
			console.log('Batch call results:', results)
		} catch (error) {
			console.error('Batch RPC call failed:', error)
		}
	}

	// To serialize a message:
	const message = rpc.message.getMyData('test', 123)
	console.log('Serialized message:', message)
</script>

<button on:click={fetchData}>Fetch Data</button>
<button on:click={batchFetchData}>Batch Fetch Data</button>
