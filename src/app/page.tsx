// app/page.tsx
import { redirect } from 'next/navigation';

export default function Index() {
    redirect('/login'); // Redirects to the login page
}
