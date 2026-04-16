import { getEmblemSrc } from '#lib/emblems';
import { Card } from '#ui/Card';
import { CopyToClipboardInput } from '#ui/controls/CopyToClipboardInput';

interface GuildEmblemUsageProps {
  guildId: string;
  guildName: string;
}

export function GuildEmblemUsage({ guildId, guildName }: GuildEmblemUsageProps) {
  return (
    <Card title="How to Use Guild Emblems">
      <p>
        Your guild emblem is a <strong>128×128 image</strong> hosted on our servers. You can use it anywhere that
        accepts image URLs — forum signatures, Discord, social media profiles, and more.
      </p>

      <div className="mt-4 flex flex-col gap-6">
        <section>
          <h3 className="mb-1 text-sm font-semibold text-gray-700">Direct Image Link</h3>
          <p className="mb-2 text-sm text-gray-500">Use this URL anywhere that accepts a direct link to an image.</p>
          <CopyToClipboardInput label="By Guild ID" value={getEmblemSrc(guildId)} />
          <CopyToClipboardInput label="By Guild Name" value={getEmblemSrc(guildName)} />
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold text-gray-700">HTML</h3>
          <p className="mb-2 text-sm text-gray-500">Paste this into any website or blog that allows custom HTML.</p>
          <CopyToClipboardInput
            label="By Guild ID"
            value={`<img src="${getEmblemSrc(guildId)}" width="128" height="128" />`}
          />
          <CopyToClipboardInput
            label="By Guild Name"
            value={`<img src="${getEmblemSrc(guildName)}" width="128" height="128" />`}
          />
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold text-gray-700">BBCode</h3>
          <p className="mb-2 text-sm text-gray-500">
            Use this in forums that support BBCode, such as Reddit or older game forums.
          </p>
          <CopyToClipboardInput label="By Guild ID" value={`[img]${getEmblemSrc(guildId)}[/img]`} />
          <CopyToClipboardInput label="By Guild Name" value={`[img]${getEmblemSrc(guildName)}[/img]`} />
        </section>
      </div>
    </Card>
  );
}
