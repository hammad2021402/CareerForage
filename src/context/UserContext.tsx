import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { toast } from 'react-hot-toast';
import {
	ApiError,
	authApi,
	type LoginPayload,
	type RegisterPayload,
	type UserProfile,
} from '../services/api';

const TOKEN_STORAGE_KEY = 'nexuslearn_access_token';

interface UserContextValue {
	user: UserProfile | null;
	token: string | null;
	initializing: boolean;
	authLoading: boolean;
	error: string | null;
	login: (payload: LoginPayload) => Promise<UserProfile>;
	register: (payload: RegisterPayload) => Promise<UserProfile>;
	logout: () => Promise<void>;
	refreshProfile: () => Promise<UserProfile | null>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [initializing, setInitializing] = useState(true);
	const [authLoading, setAuthLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const persistToken = useCallback((accessToken: string | null) => {
		if (accessToken) {
			localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
		} else {
			localStorage.removeItem(TOKEN_STORAGE_KEY);
			localStorage.removeItem('nexuslearn_refresh_token');
		}
		setToken(accessToken);
	}, []);

	useEffect(() => {
		const handleTokenRefreshed = () => {
			const newToken = localStorage.getItem(TOKEN_STORAGE_KEY);
			setToken(newToken);
			if (newToken) {
				authApi.me(newToken).then(setUser).catch(console.error);
			}
		};

		const handleSessionExpired = () => {
			persistToken(null);
			setUser(null);
			toast.error('Session expired. Please sign in again.');
		};

		window.addEventListener('auth_token_refreshed', handleTokenRefreshed);
		window.addEventListener('auth_session_expired', handleSessionExpired);

		const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
		const storedRefreshToken = localStorage.getItem('nexuslearn_refresh_token');
		if (!storedToken) {
			setInitializing(false);
			return () => {
				window.removeEventListener('auth_token_refreshed', handleTokenRefreshed);
				window.removeEventListener('auth_session_expired', handleSessionExpired);
			};
		}

		setToken(storedToken);
		authApi
			.me(storedToken)
			.then((profile) => {
				setUser(profile);
				setInitializing(false);
			})
			.catch(async (err) => {
				console.error('Failed to load user session, attempting refresh...', err);
				if (storedRefreshToken) {
					try {
						const refreshRes = await authApi.refresh(storedRefreshToken);
						if (refreshRes.access_token) {
							persistToken(refreshRes.access_token);
							if (refreshRes.refresh_token) {
								localStorage.setItem('nexuslearn_refresh_token', refreshRes.refresh_token);
							}
							const profile = await authApi.me(refreshRes.access_token);
							setUser(profile);
							setInitializing(false);
							return;
						}
					} catch (refreshErr) {
						console.error('Failed to refresh token', refreshErr);
					}
				}
				persistToken(null);
				setUser(null);
				setInitializing(false);
			});

		return () => {
			window.removeEventListener('auth_token_refreshed', handleTokenRefreshed);
			window.removeEventListener('auth_session_expired', handleSessionExpired);
		};
	}, [persistToken]);

	const login = useCallback(async (payload: LoginPayload) => {
		setAuthLoading(true);
		setError(null);
		try {
			const result = await authApi.login(payload);
			if (!result.access_token) {
				throw new ApiError('Authentication token missing in response');
			}
			persistToken(result.access_token);
			if (result.refresh_token) {
				localStorage.setItem('nexuslearn_refresh_token', result.refresh_token);
			}
			setUser(result.user);
			toast.success(`Welcome back${result.user.full_name ? `, ${result.user.full_name}` : ''}!`);
			return result.user;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.';
			setError(message);
			toast.error(message);
			throw err;
		} finally {
			setAuthLoading(false);
		}
	}, [persistToken]);

	const register = useCallback(async (payload: RegisterPayload) => {
		setAuthLoading(true);
		setError(null);
		try {
			const result = await authApi.register(payload);
			if (!result.access_token) {
				throw new ApiError('Authentication token missing in response');
			}
			persistToken(result.access_token);
			if (result.refresh_token) {
				localStorage.setItem('nexuslearn_refresh_token', result.refresh_token);
			}
			setUser(result.user);
			toast.success('Account created successfully!');
			return result.user;
		} catch (err) {
			const message = err instanceof ApiError ? err.message : 'Unable to sign up. Please try again.';
			setError(message);
			toast.error(message);
			throw err;
		} finally {
			setAuthLoading(false);
		}
	}, [persistToken]);

	const logout = useCallback(async () => {
		if (!token) {
			persistToken(null);
			setUser(null);
			return;
		}

		setAuthLoading(true);
		try {
			await authApi.logout(token);
		} catch (err) {
			console.warn('Failed to call logout endpoint', err);
		} finally {
			persistToken(null);
			setUser(null);
			setAuthLoading(false);
			toast.success('Signed out successfully');
		}
	}, [token, persistToken]);

	const refreshProfile = useCallback(async () => {
		if (!token) {
			return null;
		}
		try {
			const profile = await authApi.me(token);
			setUser(profile);
			return profile;
		} catch (err) {
			console.error('Failed to refresh profile', err);
			if (err instanceof ApiError && err.status === 401) {
				await logout();
			}
			return null;
		}
	}, [token, logout]);

	const value = useMemo<UserContextValue>(() => ({
		user,
		token,
		initializing,
		authLoading,
		error,
		login,
		register,
		logout,
		refreshProfile,
	}), [user, token, initializing, authLoading, error, login, register, logout, refreshProfile]);

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
}
