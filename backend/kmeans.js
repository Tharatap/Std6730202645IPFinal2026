// Pure 1D K-Means. Returns [{ centroid, count }] sorted by centroid asc (unrounded, empty clusters removed).
function kMeans1D(values, k = 3, maxIter = 100) {
  const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const n = nums.length;
  if (n === 0) return [];

  const uniq = [...new Set(nums)];
  k = Math.max(1, Math.min(k, uniq.length));

  // Init: min / median / max (fallback to distinct unique values if median collides)
  let centroids;
  if (k === 1) centroids = [nums[0]];
  else if (k === 2) centroids = [nums[0], nums[n - 1]];
  else {
    const median = n % 2 ? nums[(n - 1) / 2] : (nums[n / 2 - 1] + nums[n / 2]) / 2;
    const mid = median > nums[0] && median < nums[n - 1] ? median : uniq[Math.floor((uniq.length - 1) / 2)];
    centroids = [nums[0], mid, nums[n - 1]];
    for (let i = 3; i < k; i++) centroids.push(uniq[Math.floor((i * (uniq.length - 1)) / (k - 1))]);
  }

  let assign = new Array(n).fill(-1);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    const next = nums.map((v) => {
      let best = 0;
      for (let c = 1; c < k; c++) {
        if (Math.abs(v - centroids[c]) < Math.abs(v - centroids[best])) best = c;
      }
      return best;
    });
    for (let i = 0; i < n; i++) if (next[i] !== assign[i]) { changed = true; break; }
    assign = next;
    if (!changed) break;

    const sums = new Array(k).fill(0);
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) { sums[assign[i]] += nums[i]; counts[assign[i]]++; }
    // Empty cluster keeps its previous centroid
    centroids = centroids.map((c, j) => (counts[j] ? sums[j] / counts[j] : c));
  }

  const counts = new Array(k).fill(0);
  for (const a of assign) counts[a]++;
  return centroids
    .map((centroid, j) => ({ centroid, count: counts[j] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => a.centroid - b.centroid);
}

function salaryClusters(salaries, k = 3) {
  return kMeans1D(salaries, k).map((c, i) => ({
    group: `Tier ${i + 1}`,
    centroid: Math.round(c.centroid),
    count: c.count,
  }));
}

module.exports = { kMeans1D, salaryClusters };
