.PHONY: generate
generate:
	@go mod tidy
	@go run . --from "../../ruleset/data" --output "../../ruleset" --srs --all

.PHONY: testrun
testrun:
	@go mod tidy
	@go run . --from "./testdata" --output "./testoutput" --srs --all

.PHONY: fmt
fmt:
	go fmt .
