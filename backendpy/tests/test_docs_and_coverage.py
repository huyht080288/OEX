def test_swagger_ui_served(client):
    res = client.get("/api/docs/")
    assert res.status_code == 200
    assert "swagger" in res.text.lower()


def test_openapi_yaml_served(client):
    res = client.get("/api/openapi.yaml")
    assert res.status_code == 200
    assert "yaml" in res.headers["content-type"]
    assert "openapi: 3.0.3" in res.text
    assert "OEX API" in res.text


def test_coverage_page_served(client):
    res = client.get("/testcoverage.html")
    assert res.status_code == 200
    assert "html" in res.headers["content-type"]
    assert "OEX Test Coverage" in res.text
    assert "Coverage Home" in res.text
    assert "/coverage/index.html" in res.text
