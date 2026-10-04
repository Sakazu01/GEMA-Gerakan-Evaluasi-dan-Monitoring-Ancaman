import json
import unittest
from io import BytesIO
from unittest.mock import patch

from app.core.config import settings
from app.services.provenance import GoogleVisionWebDetection, provider


class ProvenanceProviderTests(unittest.TestCase):
    def test_provider_is_optional(self):
        with patch.object(settings,"web_image_provider","none"):
            self.assertIsNone(provider())

    def test_google_web_detection_orders_and_deduplicates_evidence(self):
        body={"responses":[{"webDetection":{
            "fullMatchingImages":[{"url":"https://images.test/fire.jpg"}],
            "partialMatchingImages":[{"url":"https://images.test/fire.jpg"},{"url":"https://images.test/crop.jpg"}],
            "visuallySimilarImages":[{"url":"https://images.test/similar.jpg"}],
            "pagesWithMatchingImages":[{"url":"https://news.test/old-fire","pageTitle":"Kebakaran lama",
                "fullMatchingImages":[{"url":"https://images.test/fire.jpg"}]}],
        }}]}
        response=BytesIO(json.dumps(body).encode())
        with patch.object(settings,"google_vision_api_key","fake"),patch.object(settings,"provenance_result_limit",3),patch("app.services.provenance.urlopen",return_value=response):
            matches=GoogleVisionWebDetection().search(b"photo")
        self.assertEqual([item["match_type"] for item in matches],["full","partial","visual"])
        self.assertEqual(matches[0]["source_page_url"],"https://news.test/old-fire")
        self.assertEqual(len({item["source_image_url"] for item in matches}),3)

    def test_provider_failure_is_a_safe_status(self):
        with patch.object(settings,"google_vision_api_key","fake"),patch("app.services.provenance.urlopen",side_effect=TimeoutError()),self.assertRaisesRegex(RuntimeError,"provider_unavailable"):
            GoogleVisionWebDetection().search(b"photo")


if __name__=="__main__":unittest.main()
