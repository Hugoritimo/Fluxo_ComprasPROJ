"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  ArrowRight,
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  LayoutDashboard,
  ListTodo,
  PackageSearch,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

// ============================================================
// TIPOS
// ============================================================

type CommandMenuProps = {
  canFinance: boolean;
  canAdmin: boolean;
};

type CommandItem = {
  id: string;
  label: string;
  description: string;
  group: string;
  href: string;
  icon: React.ReactNode;
  keywords: string[];
};

// ============================================================
// COMPONENTE
// ============================================================

export default function CommandMenu({
  canFinance,
  canAdmin,
}: CommandMenuProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const reduceMotion =
    useReducedMotion();

  const inputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const deferredQuery =
    useDeferredValue(
      query
    );

  // =========================================================
  // COMMANDS
  // =========================================================

  const commands =
    useMemo<CommandItem[]>(
      () => {
        const items: CommandItem[] =
          [
            {
              id:
                "dashboard",

              label:
                "Dashboard",

              description:
                "Visão geral da operação",

              group:
                "Navegação",

              href:
                "/dashboard",

              icon:
                <LayoutDashboard
                  size={16}
                />,

              keywords: [
                "inicio",
                "home",
                "dashboard",
              ],
            },

            {
              id:
                "new-card",

              label:
                "Nova solicitação",

              description:
                "Solicitar cartão corporativo",

              group:
                "Ações",

              href:
                "/solicitacoes/nova",

              icon:
                <Send
                  size={16}
                />,

              keywords: [
                "nova",
                "solicitar",
                "cartao",
              ],
            },

            {
              id:
                "requests",

              label:
                "Minhas solicitações",

              description:
                "Acompanhar solicitações de cartão",

              group:
                "Minha operação",

              href:
                "/solicitacoes",

              icon:
                <CreditCard
                  size={16}
                />,

              keywords: [
                "cartao",
                "solicitacao",
              ],
            },

            {
              id:
                "returns",

              label:
                "Devoluções",

              description:
                "Prestação e devolução de cartões",

              group:
                "Minha operação",

              href:
                "/devolucoes",

              icon:
                <RotateCcw
                  size={16}
                />,

              keywords: [
                "devolucao",
                "prestacao",
              ],
            },

            {
              id:
                "orders",

              label:
                "Meus pedidos",

              description:
                "Acompanhar solicitações do Sienge",

              group:
                "Minha operação",

              href:
                "/meus-pedidos",

              icon:
                <PackageSearch
                  size={16}
                />,

              keywords: [
                "pedido",
                "sienge",
                "sc",
              ],
            },

            {
              id:
                "pending",

              label:
                "Pendências",

              description:
                "Itens que precisam de atenção",

              group:
                "Navegação",

              href:
                "/pendencias",

              icon:
                <ListTodo
                  size={16}
                />,

              keywords: [
                "pendencia",
                "sla",
                "atraso",
              ],
            },
          ];

        if (
          canFinance
        ) {
          items.push(
            {
              id:
                "finance-requests",

              label:
                "Gerenciar solicitações",

              description:
                "Fila financeira de cartões",

              group:
                "Financeiro",

              href:
                "/financeiro/solicitacoes",

              icon:
                <WalletCards
                  size={16}
                />,

              keywords: [
                "financeiro",
                "solicitacao",
              ],
            },

            {
              id:
                "finance-returns",

              label:
                "Conferir devoluções",

              description:
                "Analisar prestações recebidas",

              group:
                "Financeiro",

              href:
                "/financeiro/devolucoes",

              icon:
                <FileCheck2
                  size={16}
                />,

              keywords: [
                "conferencia",
                "devolucao",
              ],
            },

            {
              id:
                "finance-sienge",

              label:
                "Acompanhamento Sienge",

              description:
                "Importações e pedidos Sienge",

              group:
                "Financeiro",

              href:
                "/financeiro/sienge",

              icon:
                <FileSpreadsheet
                  size={16}
                />,

              keywords: [
                "sienge",
                "sc",
                "pedido",
                "importacao",
              ],
            }
          );
        }

        if (
          canAdmin
        ) {
          items.push({
            id:
              "users",

            label:
              "Usuários e acessos",

            description:
              "Contas, permissões e segurança",

            group:
              "Administração",

            href:
              "/administracao/usuarios",

            icon:
              <UsersRound
                size={16}
              />,

            keywords: [
              "usuario",
              "permissao",
              "admin",
              "acesso",
            ],
          });
        }

        return items;
      },
      [
        canFinance,
        canAdmin,
      ]
    );

  // =========================================================
  // FILTRO
  // =========================================================

  const normalizedQuery =
    normalize(
      deferredQuery
    );

  const filteredCommands =
    useMemo(
      () => {
        if (
          !normalizedQuery
        ) {
          return commands;
        }

        return commands.filter(
          (
            command
          ) => {
            const searchable =
              normalize(
                [
                  command.label,
                  command.description,
                  command.group,
                  ...command.keywords,
                ].join(
                  " "
                )
              );

            return searchable.includes(
              normalizedQuery
            );
          }
        );
      },
      [
        commands,
        normalizedQuery,
      ]
    );

  // =========================================================
  // CTRL + K
  // =========================================================

  useEffect(
    () => {
      function handleKeyDown(
        event: KeyboardEvent
      ) {
        if (
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();

          setOpen(
            (
              current
            ) =>
              !current
          );
        }

        if (
          event.key ===
            "Escape"
        ) {
          setOpen(
            false
          );
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () =>
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
    },
    []
  );

  // =========================================================
  // FECHAR AO NAVEGAR
  // =========================================================

  useEffect(
    () => {
      setOpen(
        false
      );

      setQuery(
        ""
      );
    },
    [
      pathname,
    ]
  );

  // =========================================================
  // FOCO
  // =========================================================

  useEffect(
    () => {
      if (!open) {
        return;
      }

      const timeout =
        window.setTimeout(
          () => {
            inputRef.current?.focus();
          },
          60
        );

      return () =>
        window.clearTimeout(
          timeout
        );
    },
    [
      open,
    ]
  );

  // =========================================================
  // NAVEGAR
  // =========================================================

  function navigate(
    href: string
  ) {
    setOpen(
      false
    );

    setQuery(
      ""
    );

    router.push(
      href
    );
  }

  // =========================================================
  // BUSCA GLOBAL
  // =========================================================

  function executeGlobalSearch() {
    const value =
      query.trim();

    if (!value) {
      return;
    }

    const destination =
      canFinance
        ? `/financeiro/sienge?tab=pedidos&q=${encodeURIComponent(
            value
          )}`
        : `/meus-pedidos?q=${encodeURIComponent(
            value
          )}`;

    navigate(
      destination
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          TRIGGER
      ====================================================== */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            true
          )
        }
        className="group flex h-10 w-full max-w-[560px] items-center gap-3 rounded-xl border border-base-300/80 bg-base-200/45 px-3 text-left transition-all hover:border-base-content/10 hover:bg-base-200 sm:px-3.5"
      >
        <Search
          size={15}
          className="shrink-0 text-base-content/30 transition group-hover:text-base-content/50"
        />

        <span className="min-w-0 flex-1 truncate text-[11px] text-base-content/35 sm:text-xs">
          Buscar no Projeta Compras...
        </span>

        <kbd className="kbd kbd-sm hidden h-6 min-h-0 gap-1 border-base-300 bg-base-100 px-2 text-[9px] font-semibold text-base-content/35 md:flex">
          Ctrl

          <span className="text-base-content/20">
            +
          </span>

          K
        </kbd>
      </button>

      {/* =====================================================
          MODAL
      ====================================================== */}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={
              reduceMotion
                ? false
                : {
                    opacity:
                      0,
                  }
            }
            animate={{
              opacity:
                1,
            }}
            exit={{
              opacity:
                0,
            }}
            className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 px-4 pt-[10vh] backdrop-blur-[3px]"
          >
            {/* BACKDROP */}

            <button
              type="button"
              aria-label="Fechar busca"
              onClick={() =>
                setOpen(
                  false
                )
              }
              className="absolute inset-0"
            />

            {/* CONTAINER */}

            <motion.div
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity:
                        0,

                      y:
                        -12,

                      scale:
                        0.985,
                    }
              }
              animate={{
                opacity:
                  1,

                y:
                  0,

                scale:
                  1,
              }}
              exit={{
                opacity:
                  0,

                y:
                  -8,

                scale:
                  0.99,
              }}
              transition={{
                duration:
                  0.16,
              }}
              className="relative z-10 w-full max-w-[650px] overflow-hidden rounded-[24px] border border-base-300 bg-base-100 shadow-[0_30px_100px_rgba(0,0,0,0.30)]"
            >
              {/* =============================================
                  SEARCH
              ============================================== */}

              <div className="flex h-[66px] items-center gap-3 border-b border-base-300 px-5">
                <Search
                  size={19}
                  className="shrink-0 text-base-content/35"
                />

                <input
                  ref={
                    inputRef
                  }
                  type="text"
                  value={
                    query
                  }
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                        "Enter"
                    ) {
                      if (
                        filteredCommands.length ===
                          1
                      ) {
                        navigate(
                          filteredCommands[0]
                            .href
                        );

                        return;
                      }

                      if (
                        query.trim()
                      ) {
                        executeGlobalSearch();
                      }
                    }
                  }}
                  placeholder="Digite uma ação, página, SC, pedido ou solicitante..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-base-content/30"
                />

                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/30 transition hover:bg-base-200 hover:text-base-content"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>

              {/* =============================================
                  CONTEÚDO
              ============================================== */}

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {/* BUSCA EM PEDIDOS */}

                {query.trim() && (
                  <button
                    type="button"
                    onClick={
                      executeGlobalSearch
                    }
                    className="group mb-2 flex w-full items-center gap-3 rounded-[14px] border border-primary/10 bg-primary/[0.035] p-3 text-left transition hover:bg-primary/[0.065]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles
                        size={16}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        Buscar por &quot;{
                          query.trim()
                        }&quot;
                      </p>

                      <p className="mt-0.5 text-[10px] text-base-content/40">
                        {canFinance
                          ? "Pesquisar em pedidos e solicitações do Sienge"
                          : "Pesquisar nos seus pedidos"}
                      </p>
                    </div>

                    <ArrowRight
                      size={15}
                      className="text-primary/50 transition group-hover:translate-x-0.5"
                    />
                  </button>
                )}

                {/* COMMANDS */}

                {filteredCommands.length >
                0 ? (
                  <CommandGroups
                    commands={
                      filteredCommands
                    }
                    onSelect={
                      navigate
                    }
                  />
                ) : (
                  !query.trim() && (
                    <div className="flex min-h-40 flex-col items-center justify-center text-center">
                      <Search
                        size={22}
                        className="text-base-content/15"
                      />

                      <p className="mt-3 text-xs font-semibold text-base-content/55">
                        Nenhuma ação encontrada
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* =============================================
                  FOOTER
              ============================================== */}

              <div className="flex items-center justify-between border-t border-base-300 bg-base-200/35 px-4 py-2.5">
                <div className="flex items-center gap-3 text-[8px] font-medium text-base-content/30">
                  <span className="flex items-center gap-1">
                    <kbd className="kbd h-5 min-h-0 px-1.5 text-[8px]">
                      ↵
                    </kbd>

                    abrir
                  </span>

                  <span className="flex items-center gap-1">
                    <kbd className="kbd h-5 min-h-0 px-1.5 text-[8px]">
                      esc
                    </kbd>

                    fechar
                  </span>
                </div>

                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-base-content/20">
                  Projeta Command
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// GROUPS
// ============================================================

function CommandGroups({
  commands,
  onSelect,
}: {
  commands: CommandItem[];

  onSelect:
    (
      href: string
    ) => void;
}) {
  const groups =
    Array.from(
      new Set(
        commands.map(
          (
            command
          ) =>
            command.group
        )
      )
    );

  return (
    <>
      {groups.map(
        (
          group
        ) => {
          const groupCommands =
            commands.filter(
              (
                command
              ) =>
                command.group ===
                group
            );

          return (
            <div
              key={
                group
              }
              className="mb-3"
            >
              <p className="px-3 py-2 text-[8px] font-bold uppercase tracking-[0.18em] text-base-content/25">
                {
                  group
                }
              </p>

              <div className="space-y-0.5">
                {groupCommands.map(
                  (
                    command
                  ) => (
                    <button
                      key={
                        command.id
                      }
                      type="button"
                      onClick={() =>
                        onSelect(
                          command.href
                        )
                      }
                      className="group flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left transition hover:bg-base-200"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-base-200 text-base-content/45 transition group-hover:bg-base-100 group-hover:text-primary">
                        {
                          command.icon
                        }
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-base-content/75">
                          {
                            command.label
                          }
                        </p>

                        <p className="mt-0.5 truncate text-[9px] text-base-content/35">
                          {
                            command.description
                          }
                        </p>
                      </div>

                      <ArrowRight
                        size={13}
                        className="translate-x-1 text-base-content/0 transition group-hover:translate-x-0 group-hover:text-base-content/25"
                      />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        }
      )}
    </>
  );
}

// ============================================================
// NORMALIZAR
// ============================================================

function normalize(
  value: string
) {
  return value
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}