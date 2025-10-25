<script lang="ts">
	import { currentUser, selectedDepartmentId, selectedShift } from '$lib/stores';

	let { children } = $props();
</script>

<div class="app">
	<header>
		<nav>
			<div class="nav-brand">
				<h1>🎓 Schedula</h1>
				<p>Smart University Class Routine Management</p>
			</div>
			<div class="nav-menu">
				<a href="/">Schedule</a>
				{#if $currentUser?.role === 'admin'}
					<a href="/departments">Departments</a>
					<a href="/teachers">Teachers</a>
					<a href="/rooms">Rooms</a>
					<a href="/courses">Courses</a>
				{/if}
				{#if $currentUser}
					<span class="user-badge">{$currentUser.name} ({$currentUser.role})</span>
				{/if}
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>© 2025 Schedula - University Class Routine Management System</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #f5f5f5;
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 1rem 2rem;
		box-shadow: 0 2px 10px rgba(0,0,0,0.1);
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 1400px;
		margin: 0 auto;
	}

	.nav-brand h1 {
		margin: 0;
		font-size: 1.8rem;
		font-weight: 700;
	}

	.nav-brand p {
		margin: 0.2rem 0 0 0;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.nav-menu {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}

	.nav-menu a {
		color: white;
		text-decoration: none;
		font-weight: 500;
		transition: opacity 0.2s;
	}

	.nav-menu a:hover {
		opacity: 0.8;
	}

	.user-badge {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.9rem;
	}

	main {
		flex: 1;
		max-width: 1400px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem;
	}

	footer {
		background: #2d3748;
		color: white;
		text-align: center;
		padding: 1.5rem;
		margin-top: auto;
	}

	footer p {
		margin: 0;
		opacity: 0.8;
	}
</style>
