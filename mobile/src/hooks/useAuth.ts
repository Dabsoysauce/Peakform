import { useDispatch, useSelector } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((state: RootState) => state.auth);

  async function handleLogout() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('role');
    await SecureStore.deleteItemAsync('email');
    dispatch(logout());
  }

  return { ...auth, handleLogout };
}
