import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type React from 'react';

interface LayoutProps {
    title: string;
    children: React.ReactNode;
}

export function Layout({ title, children }: LayoutProps) {
    return (
        <div className='flex min-h-screen bg-gray-50 dark:bg-gray-950'>
            <Sidebar />
            <div className='flex-1 flex flex-col min-w-0'>
                <Header title={title} />
                <main className='flex-1 p-6'>
                    {children}
                </main>
            </div>
        </div>
    );
}