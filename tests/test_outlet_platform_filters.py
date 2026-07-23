import unittest

from fastapi import HTTPException

from main import list_outlets, normalize_platform_filters


class FakeQuery:
    def __init__(self):
        self.joined = False
        self.filter_expression = None

    def join(self, *_args):
        self.joined = True
        return self

    def filter(self, expression):
        self.filter_expression = expression
        return self

    def all(self):
        return []


class FakeSession:
    def __init__(self):
        self.query_instance = FakeQuery()

    def query(self, *_args):
        return self.query_instance


class NormalizePlatformFiltersTest(unittest.TestCase):
    def test_normalizes_and_deduplicates_platforms(self):
        self.assertEqual(
            normalize_platform_filters([" Grab ", "gofood", "GRAB", "shopee"]),
            ["grab", "gofood", "shopee"],
        )

    def test_empty_filter_returns_all_platforms_mode(self):
        self.assertEqual(normalize_platform_filters(None), [])
        self.assertEqual(normalize_platform_filters([]), [])

    def test_rejects_unsupported_platform(self):
        with self.assertRaises(HTTPException) as context:
            normalize_platform_filters(["grab", "unknown"])

        self.assertEqual(context.exception.status_code, 422)
        self.assertEqual(context.exception.detail["unsupported"], ["unknown"])


class ListOutletsTest(unittest.TestCase):
    def test_applies_multi_platform_filter_to_query(self):
        session = FakeSession()

        self.assertEqual(list_outlets(platform=["grab", "gofood"], db=session), [])
        self.assertTrue(session.query_instance.joined)
        sql = str(session.query_instance.filter_expression.compile(compile_kwargs={"literal_binds": True}))
        self.assertIn("grab", sql)
        self.assertIn("gofood", sql)

    def test_without_platform_does_not_join_accounts(self):
        session = FakeSession()

        self.assertEqual(list_outlets(platform=None, db=session), [])
        self.assertFalse(session.query_instance.joined)


if __name__ == "__main__":
    unittest.main()
