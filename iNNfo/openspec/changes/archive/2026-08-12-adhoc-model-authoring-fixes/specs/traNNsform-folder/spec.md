# Delta Specification: traNNsform-folder

## ADDED Requirements

### Requirement: Supported Scanner File Extensions and Omission Warnings

The traNNsform document scanner MUST support `.xls` files for scanning and classification alongside `.xlsx`, `.docx`, and `.pdf` files. When scanning a target directory, any file with an unsupported extension MUST be omitted from the input document list and MUST generate an explicit warning message detailing the omitted file path and unsupported extension.

#### Scenario: Scanning directory with .xls spreadsheet file

- GIVEN a traNNsform input directory containing a `.xls` file
- WHEN the media scanner processes the directory
- THEN the `.xls` file MUST be recognized as a valid input document
- AND no omission warning MUST be emitted for that file

#### Scenario: Scanning directory with unsupported file extensions

- GIVEN a traNNsform input directory containing unsupported files such as `.txt` or `.zip`
- WHEN the media scanner processes the directory
- THEN the unsupported files MUST be omitted from the document list
- AND an explicit warning MUST be emitted listing each omitted file and its unsupported extension
