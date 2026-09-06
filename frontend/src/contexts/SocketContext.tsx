'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

// Ruta del handshake de socket.io en el backend. Caddy enruta `/api/*` al backend,
// así que el gateway escucha en `/api/socket.io` (ver realtime.gateway.ts).
const SOCKET_PATH = '/api/socket.io';

// El origin del socket sale de NEXT_PUBLIC_API_URL sin el sufijo `/api`:
// socket.io toma el path de la URL como namespace, y `/api` no es un namespace válido.
const getSocketOrigin = (): string => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (apiUrl) {
        try {
            return new URL(apiUrl, typeof window !== 'undefined' ? window.location.origin : undefined).origin;
        } catch {
            return apiUrl.replace(/\/api\/?$/, '');
        }
    }

    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:4000`;
    }

    return 'http://localhost:4000';
};

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    joinSection: (sectionId: string) => void;
    leaveSection: (sectionId: string) => void;
    subscribeDevice: (deviceId: string) => void;
    unsubscribeDevice: (deviceId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    joinSection: () => {},
    leaveSection: () => {},
    subscribeDevice: () => {},
    unsubscribeDevice: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { isAuthenticated, session } = useAuth();

    useEffect(() => {
        // El gateway exige token en producción: sin sesión no se abre el socket.
        const token =
            (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null) ||
            session?.access_token ||
            null;

        if (!token) {
            setSocket(null);
            setIsConnected(false);
            return;
        }

        const socketInstance = io(getSocketOrigin(), {
            path: SOCKET_PATH,
            transports: ['websocket', 'polling'],
            autoConnect: true,
            auth: { token }, // Enviar token en el handshake
        });

        socketInstance.on('connect', () => {
            console.log('Socket connected:', socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        socketInstance.on('error', (error) => {
            console.error('Socket error:', error);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [isAuthenticated, session?.access_token]);

    // Suscribirse a actualizaciones de una sección
    const joinSection = useCallback((sectionId: string) => {
        if (socket && isConnected) {
            socket.emit('join_section', sectionId);
            console.log('Joined section:', sectionId);
        }
    }, [socket, isConnected]);

    // Desuscribirse de una sección
    const leaveSection = useCallback((sectionId: string) => {
        if (socket && isConnected) {
            socket.emit('leave_section', sectionId);
            console.log('Left section:', sectionId);
        }
    }, [socket, isConnected]);

    // Suscribirse a un dispositivo específico
    const subscribeDevice = useCallback((deviceId: string) => {
        if (socket && isConnected) {
            socket.emit('subscribe_device', deviceId);
        }
    }, [socket, isConnected]);

    // Desuscribirse de un dispositivo
    const unsubscribeDevice = useCallback((deviceId: string) => {
        if (socket && isConnected) {
            socket.emit('unsubscribe_device', deviceId);
        }
    }, [socket, isConnected]);

    return (
        <SocketContext.Provider value={{ 
            socket, 
            isConnected, 
            joinSection, 
            leaveSection,
            subscribeDevice,
            unsubscribeDevice,
        }}>
            {children}
        </SocketContext.Provider>
    );
};
