
import { api } from './apiService';

interface LoginResponse {
    access_token: string;
}

export interface User {
    userId: string;
    username: string;
}

export const authService = {
    login: async (username: string, password: string): Promise<LoginResponse> => {
        return api.post<LoginResponse>('/auth/login', { username, password });
    },

    getProfile: async (): Promise<User> => {
        return api.get<User>('/auth/profile');
    },
};
