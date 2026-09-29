package main

import (
	"encoding/binary"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
)

var (
	generateSRS  bool
	generateAll  bool
	providerPath string
	outputPath   string
)

type Entry struct {
	Ruleset RuleSet
	Name    string
	Type    string
}

var alwaysfalse bool

func main() {
	flag.BoolVar(&generateSRS, "srs", false, "Generate SRS")
	flag.BoolVar(&generateAll, "all", false, "Generate all SRS formats")
	flag.StringVar(&providerPath, "from", "./data/", "Setup datasource")
	flag.StringVar(&outputPath, "output", "./output/", "Setup output")
	flag.Usage = func() {
		_, _ = fmt.Fprintf(flag.CommandLine.Output(), "Usage of %s:\n", "ruleset-generator")
		flag.PrintDefaults()
	}
	flag.Parse()
	if !generateSRS {
		flag.Usage()
		return
	}

	var entries []Entry
	err := filepath.WalkDir(providerPath, func(path string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || !entry.Type().IsRegular() {
			return err
		}

		var (
			ruleset RuleSet
			typ     string
		)
		switch filepath.Base(filepath.Dir(path)) {
		case "domain":
			typ = "domain"
			ruleset, err = NewDomainFile(path)
		case "ip":
			typ = "ip"
			ruleset, err = NewIPFile(path)
		default:
			_, _ = fmt.Fprintf(os.Stderr, "[ERROR] unable to determine rule type for %s\n", path)
			return nil
		}
		if err != nil {
			return err
		}
		entries = append(entries, Entry{Ruleset: ruleset, Name: entry.Name(), Type: typ})
		return nil
	})
	if err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "[ERROR] %s\n", err.Error())
		return
	}
	if err := generateSRSFunc(entries); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "[ERROR] %s\n", err.Error())
	}
}

func generateSRSFunc(entries []Entry) error {
	formatList := []string{SRSFormatBinary}
	if generateAll {
		formatList = append(formatList, SRSFormatJSON)
	}
	for _, entry := range entries {
		for _, format := range formatList {
			path := filepath.Join(outputPath, entry.Type, "srs", entry.Name+SRSFormatToSuffix(format))
			if err := openWrite(path, func(w io.Writer) error {
				return entry.Ruleset.WriteSRS(w, format)
			}); err != nil {
				return err
			}
		}
	}
	return nil
}

func openWrite(path string, then func(w io.Writer) error) error {
	if err := os.MkdirAll(filepath.Dir(path), 0777); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}
	output, err := os.OpenFile(path, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0666)
	if err != nil {
		return err
	}
	defer output.Close()
	return then(output)
}

type writeBinaryOperation struct {
	Bytes  []byte
	Binary any
	Ending binary.ByteOrder
}

func writeGuard(w io.Writer, operations ...writeBinaryOperation) error {
	var err error
	for _, operation := range operations {
		if operation.Ending != nil {
			err = binary.Write(w, operation.Ending, operation.Binary)
		}
		if err != nil {
			return err
		}
		if len(operation.Bytes) != 0 {
			if _, err = w.Write(operation.Bytes); err != nil {
				return err
			}
		}
	}
	return nil
}
