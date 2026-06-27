import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import AdminAvisos from '../admin/AdminAvisos';
import { useLanguage } from '../../context/LanguageContext';

export default function TalentManagerAvisos() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="flex flex-1 flex-col lg:pl-[240px]">
        <TalentManagerTopbar titulo={t('admin_menu_avisos')} subtitulo="Talent Manager" />
        <main className="mx-auto w-full max-w-[1560px] px-5 pb-28 pt-8 lg:px-10 lg:pb-8 xl:px-16">
          <AdminAvisos />
        </main>
      </div>
    </div>
  );
}
