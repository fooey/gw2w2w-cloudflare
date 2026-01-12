/* eslint-disable @next/next/no-img-element */

const guildIds = [
  '4bbb52aa-d768-4fc6-8ede-c299f2822f0f',
  '0560f931-40de-e811-81a8-a25fc8b1a2fe',
  '4b9a0dd5-79e4-e811-81a8-e8b6963692b8',
  '97c007dc-87d5-e311-9621-ac162dae8acd',
  '41db3c08-78c3-e611-80d4-e4115beba648',
];

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans text-zinc-900">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white sm:items-start">
        <header>gw2</header>
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <ul>
            {guildIds.map((guildId) => (
              <li key={guildId}>
                <img
                  className="inline-block w-32 h-32 mb-2 bg-linear-to-br from-white to-red-900"
                  src={`http://127.0.0.1:8787/emblem/${guildId}`}
                  alt="Emblem"
                />
                <div>{guildId}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <footer>footer</footer>
        </div>
      </main>
    </div>
  );
}
