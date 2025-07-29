{{/*
Expand the name of the chart.
*/}}
{{- define "sourcebot.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "sourcebot.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "sourcebot.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sourcebot.labels" -}}
helm.sh/chart: {{ include "sourcebot.chart" . }}
{{ include "sourcebot.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sourcebot.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sourcebot.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "sourcebot.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "sourcebot.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
OAuth2 Proxy labels
*/}}
{{- define "sourcebot.oauth2ProxyLabels" -}}
helm.sh/chart: {{ include "sourcebot.chart" . }}
{{ include "sourcebot.oauth2ProxySelectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: oauth2-proxy
{{- end }}

{{/*
OAuth2 Proxy selector labels
*/}}
{{- define "sourcebot.oauth2ProxySelectorLabels" -}}
app.kubernetes.io/name: {{ include "sourcebot.name" . }}-oauth2-proxy
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
OAuth2 Proxy fullname
*/}}
{{- define "sourcebot.oauth2ProxyFullname" -}}
{{- printf "%s-oauth2-proxy" (include "sourcebot.fullname" .) }}
{{- end }}