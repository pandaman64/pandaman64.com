import { createRoute } from "honox/factory";

const Link = ({
  href,
  children,
  outgoing,
}: {
  href: string;
  children?: JSX.Element | string;
  outgoing: boolean;
}) => {
  return (
    <a
      href={href}
      className="text-blue-600 hover:underline dark:text-blue-500"
      target={outgoing ? "_blank" : undefined}
      referrerPolicy={outgoing ? "no-referrer" : undefined}
    >
      {children}
    </a>
  );
};

export default createRoute((c) => {
  return c.render(
    <div className="min-h-screen">
      <div>
        <div className="mx-auto max-w-7xl gap-4 p-4">
          <div className="flex flex-row align-middle text-4xl">
            <div>井山梃子歴史館</div>
          </div>
          <section>
            <h2 className="text-xl">Software Engineer</h2>
          </section>
        </div>
      </div>
      <main className="mx-auto max-w-7xl flex flex-col gap-4 px-4">
        <section>
          <h2 className="text-2xl">Love</h2>
          <ul className="list-inside list-disc text-lg">
            <li>Rust</li>
            <li>梅</li>
            <li>Lean 4</li>
            <li>
              <Link href="https://www.youtube.com/@UzukiKou" outgoing>
                卯月コウ
              </Link>
            </li>
            <li>
              <Link href="https://www.youtube.com/@YUKANAGASE" outgoing>
                長瀬有花
              </Link>
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl">Selected Projects</h2>
          <ul className="list-inside list-disc text-lg">
            <li>
              <Link href="https://github.com/pandaman64/lean-regex" outgoing>
                Lean Regex
              </Link>
              : formally verified Regex library written in Lean 4
            </li>
            <li>
              <Link href="https://udukohh.land/" outgoing>
                udukohh.land
              </Link>
              : fan site for 卯月コウ
            </li>
            <li>
              <Link href="https://github.com/pandaman64/novelviewer" outgoing>
                Novelviewer
              </Link>
              : image viewer and search engine for AI-generated images, written
              in Rust with Tauri
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl">Interests</h2>
          <ul className="list-inside list-disc text-lg">
            <li>Formally Verified Programs</li>
            <li>Programming Languages</li>
            <li>Concurrency and Memory Models</li>
            <li>Economics</li>
            <li>Ethics</li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl">Contact</h2>
          <ul className="list-inside list-disc text-lg">
            <li>
              𝕏:{" "}
              <Link href="https://twitter.com/__pandaman64__" outgoing>
                __pandaman64__
              </Link>
            </li>
            <li>
              Misskey:{" "}
              <Link href="https://misskey.io/@pandaman64" outgoing>
                @pandaman64
              </Link>
            </li>
            <li>
              GitHub:{" "}
              <Link href="https://github.com/pandaman64" outgoing>
                pandaman64
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>,
    { title: "井山梃子歴史館" }
  );
});
