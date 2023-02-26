// https://gist.github.com/axelpale/3118596

const k_combinations = (set, k) => {
  if (k > set.length || k <= 0) {
    return []
  }
  if (k === set.length) {
    return [set]
  }
  const combs = []
  if (k === 1) {
    for (let i = 0; i < set.length; i++) {
      combs.push([set[i]])
    }
    return combs
  }
  for (let i = 0; i < set.length - k + 1; i++) {
    const head = set.slice(i, i + 1)
    const tailcombs = k_combinations(set.slice(i + 1), k - 1)
    for (let j = 0; j < tailcombs.length; j++) {
      combs.push(head.concat(tailcombs[j]))
    }
  }
  return combs
}

const combinations = (set) => {
  const combs = [];
  for (let k = 1; k <= set.length; k++) {
    const k_combs = k_combinations(set, k)
    for (let i = 0; i < k_combs.length; i++) {
      combs.push(k_combs[i])
    }
  }
  return combs
}
