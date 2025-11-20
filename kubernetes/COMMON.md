# Konsoles auditpierakstu līmeņa konfigurēšana

**Versija:** Mednis 2025.11.20

## Apraksts

HoP izdrukā auditpierakstus arī aplikācijas konsolē. Iepriekš konsolē noklusēti tika drukāti visi auditpieraksti, kas ir `Debug` līmenī vai augstākā līmenī. Līdz ar versiju Mednis 2025.11.20 ir iespēja mainīt, kāda līmeņa auditpieraksti tiek drukāti konsolē.

## Parametrs LogConsoleMinLevel

Par konsolē drukājamo auditpierakstu līmeni atbildīgs parametrs ir **LogConsoleMinLevel**.

### Iespējamās vērtības

| Līmenis | Apraksts |
|---------|----------|
| **Trace** | Tiek fiksētas tehniskas detaļas, visdetalizētākais auditpierakstu līmenis. |
| **Debug** | Tiek fiksētas tehniskas detaļas, bet ne tik detalizēti, cik līmenī Trace. |
| **Info** vai **Information** | Tiek fiksēti informatīvi auditpieraksti, kas apraksta lietotāju veiktās operācijas vai informatīvus paziņojumus par sistēmas darbu. |
| **Warn** vai **Warning** | Tiek fiksēti brīdinājumi, kas netraucē sistēmas darbu, bet var norādīt uz problēmām. |
| **Error** | Tiek fiksētas kļūdas, gan tādas, kas traucē tikai lietotāja darbu, gan tādas, kas var traucēt sistēmas darbību. |
| **Fatal** | Tiek fiksētas tikai tādas kļūdas, kuru dēļ programma nespēj veikt darbu un tiek aizvērta. |
| **Off** | Auditpierakstu drukāšana konsolē ir atslēgta. |

### Noklusējuma uzvedība

Ja netiek norādīta nekāda vērtība, noklusēti tiek izmantota vērtība **Debug**, kā tas bija pirms izmaiņām.

### Darbības princips

Konsolē tiek drukāti parametrā `LogConsoleMinLevel` norādītā līmeņa auditpieraksti un augstāko šo līmeņu auditpieraksti.

**Piemērs:** Ja norādīta vērtība `Info`, tad konsolē tiks drukāti auditpieraksti ar līmeni:
- Info
- Warn
- Error
- Fatal

## Konfigurācijas metodes

Parametru `LogConsoleMinLevel` iespējams mainīt šādos veidos:

## Piemēri

### Environment Variable

```bash
export LogConsoleMinLevel=Info
```

### appsettings.json

```json
{
  "LogConsoleMinLevel": "Info"
}
```

### Kubernetes YAML

```yaml
  LogConsoleMinLevel: 'Error'
```
