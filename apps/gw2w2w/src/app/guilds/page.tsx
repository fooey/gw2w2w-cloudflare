import { DemoGuildList } from '#ui/guilds/DemoGuildList';
import { GuildSearch } from '#ui/guilds/guild-search/GuildSearch';
import { SiteLayout } from '#ui/layout/SiteLayout';

export default function EmblemsPage() {
  return (
    <SiteLayout pageHeader={'Guild Emblems'} headerActions={<GuildSearch />}>
      <DemoGuildList />
    </SiteLayout>
  );
}
