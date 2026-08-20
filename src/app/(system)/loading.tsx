export default function SystemLoading() {
  return (
    <div className="mx-auto max-w-[1500px] animate-in">
      {/* CABEÇALHO */}

      <div className="mb-8">
        <div className="skeleton h-4 w-24" />

        <div className="skeleton mt-3 h-9 w-80 max-w-full" />

        <div className="skeleton mt-3 h-4 w-[520px] max-w-full" />
      </div>

      {/* CARDS */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map(
          (
            _,
            index
          ) => (
            <div
              key={
                index
              }
              className="card border border-base-300 bg-base-100"
            >
              <div className="card-body p-5">
                <div className="skeleton h-10 w-10 rounded-box" />

                <div className="skeleton mt-3 h-7 w-20" />

                <div className="skeleton mt-2 h-3 w-32" />
              </div>
            </div>
          )
        )}
      </div>

      {/* CONTEÚDO */}

      <div className="card border border-base-300 bg-base-100">
        <div className="card-body">
          <div className="skeleton h-5 w-48" />

          <div className="mt-6 space-y-4">
            {Array.from({
              length: 6,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="flex items-center gap-4 border-b border-base-300 pb-4"
                >
                  <div className="skeleton h-10 w-10 shrink-0 rounded-box" />

                  <div className="flex-1">
                    <div className="skeleton h-4 w-48 max-w-full" />

                    <div className="skeleton mt-2 h-3 w-72 max-w-full" />
                  </div>

                  <div className="skeleton hidden h-7 w-24 sm:block" />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}