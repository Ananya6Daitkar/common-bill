import { searchEntities, getAffinity } from "../lib/qloo";
async function main() {
  const movieResults = await searchEntities("Columbus", "movie");
  const film = movieResults.find(
    (r) => r.name === "Columbus" && Number(r.year) === 2017,
  );
  if (!film) throw new Error("Could not uniquely identify Columbus (2017).");
  const bookQueries = [
    { title: "Invisible Cities", year: 1972 },
    { title: "A Month in the Country", year: 1980 },
  ];
  const books = [];
  for (const { title, year } of bookQueries) {
    const results = await searchEntities(title, "book");
    const matches = results.filter(
      (r) =>
        r.name.toLowerCase() === title.toLowerCase() && Number(r.year) === year,
    );
    if (matches.length !== 1) {
      console.log(
        JSON.stringify(
          { check: "book-disambiguation", title, results },
          null,
          2,
        ),
      );
      throw new Error("Book requires manual disambiguation.");
    }
    books.push(matches[0]);
  }
  const forward = await getAffinity(
    film.entityId,
    books.map((b) => b.entityId),
    "book",
  );
  const reverse = await getAffinity(
    books[0].entityId,
    [film.entityId],
    "movie",
  );
  console.log(
    JSON.stringify(
      {
        check: "Qloo cross-domain contract",
        ok: true,
        film,
        books,
        forward,
        reverse,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Qloo check failed");
  process.exitCode = 1;
});
