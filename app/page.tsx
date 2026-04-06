import { redirect } from 'next/navigation';

// Root now redirects to FrameLink admin login.
// Client chatbots live at /c/:slug
export default function Home() {
  redirect('/admin/login');
}
