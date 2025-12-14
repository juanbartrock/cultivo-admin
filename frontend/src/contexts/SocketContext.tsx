'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

    useEffect(() => {
        // Obtener token de autenticación
        const token = localStorage.getItem('auth_token');

        const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
            transports: ['websocket'],
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
    }, []);

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
