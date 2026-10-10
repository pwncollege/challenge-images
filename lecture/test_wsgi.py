import ast
import random
import unittest
from pathlib import Path


source_path = Path(__file__).with_name("wsgi.py")
function = next(
    node
    for node in ast.parse(source_path.read_text()).body
    if isinstance(node, ast.FunctionDef) and node.name == "resolve_timeline_coverage"
)
namespace = {}
exec(
    compile(ast.Module(body=[function], type_ignores=[]), str(source_path), "exec"),
    namespace,
)
resolve_timeline_coverage = namespace["resolve_timeline_coverage"]


class TimelineCoverageTests(unittest.TestCase):
    def coverage(self, points):
        return resolve_timeline_coverage(
            [{"timestamp": timestamp, "player": {"time": position}} for timestamp, position in points]
        )

    def test_playback_with_jitter_and_clock_drift(self):
        rng = random.Random(365)
        for rate in (1.0, 2.0, 2.02):
            with self.subTest(rate=rate):
                points = [(0.0, 0.0)] + [
                    (index * 10.0 + rng.uniform(0.0, 4.0), index * 10.0 * rate)
                    for index in range(1, 361)
                ]
                valid, invalid = self.coverage(points)
                self.assertEqual(valid, [(0.0, points[-1][1])])
                self.assertEqual(invalid, [])

    def test_pause_and_replay_do_not_duplicate_coverage(self):
        valid, invalid = self.coverage(
            [(0, 0), (10, 10), (20, 10), (21, 0), (31, 10), (41, 20)]
        )
        self.assertEqual(valid, [(0, 20)])
        self.assertEqual(invalid, [])

    def test_exact_budget_boundary_is_accepted(self):
        valid, invalid = self.coverage([(0, 0), (10, 31), (20, 52)])
        self.assertEqual(valid, [(0, 52)])
        self.assertEqual(invalid, [])

    def test_cumulative_credit_is_bounded_by_elapsed_time(self):
        rng = random.Random(365)
        for _ in range(5000):
            timestamp = position = 0.0
            points = [(timestamp, position)]
            for _ in range(rng.randrange(1, 80)):
                timestamp += rng.uniform(0.0, 20.0)
                position = max(0.0, position + rng.uniform(-20.0, 55.0))
                points.append((timestamp, position))
            valid, _ = self.coverage(points)
            credited_time = sum(end - start for start, end in valid)
            self.assertLessEqual(credited_time, 2.1 * timestamp + 10.0 + 1e-8)


if __name__ == "__main__":
    unittest.main()
