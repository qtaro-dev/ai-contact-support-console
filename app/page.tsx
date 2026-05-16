import HomePageClient from '@/app/HomePageClient';
import { getAiModeDisplay } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';

const HomePage = () => <HomePageClient aiMode={getAiModeDisplay()} />;

export default HomePage;
