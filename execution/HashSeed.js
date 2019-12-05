export default HashSeed = (isolate) => {
  let roots = new ReadOnlyRoots(isolate);
  let seed = roots.hash_seed();
  return seed;
}

class ReadOnlyRoots {
  hash_seed() {
    return 0;
  }
}