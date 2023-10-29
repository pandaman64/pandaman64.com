import { ReactNode } from "react";

const Link = ({
  href,
  children,
  outgoing,
}: {
  href: string;
  children?: ReactNode;
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

const Home = () => {
  return (
    <div className="min-h-screen">
      <div>
        <div className="mx-auto flex max-w-7xl flex-row gap-4 p-4 align-middle text-4xl">
          <div>井山梃子歴史館</div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl gap-2 px-4">
        <section>
          <h2 className="text-xl">Software Engineer</h2>
        </section>
        <section>
          <h2 className="text-2xl">Love</h2>
          <ul className="list-inside list-disc text-lg">
            <li>Rust</li>
            <li>梅</li>
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
          <h2 className="text-2xl">Interests</h2>
          <ul className="list-inside list-disc text-lg">
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
    </div>
  );
};

export default Home;
