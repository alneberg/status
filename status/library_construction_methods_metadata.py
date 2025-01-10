import json

from status.util import SafeHandler


class LibraryConstructionMethodsMetadataHandler(SafeHandler):
    """Serves a page with statistics over lanes ordered"""

    def get(self):
        t = self.application.loader.load("library_construction_methods_metadata.html")

        construction_methods = {
            "SMARTer Total Stranded RNA-seq, Pico input mammalian - V3": {
                "library_strategy": "RNA-Seq",
                "library_source": "",
                "library_selection": "",
            },
            "Illumina DNA PCR-free": {
                "library_strategy": "WGS",
                "library_source": "GENOMIC",
                "library_selection": "PCR-free",
            },
            "Illumina DNA (No QC)": {
                "library_strategy": "NGI_MANUAL",
                "library_source": "NGI_MANUAL",
                "library_selection": "NGI_MANUAL",
            },
            "16S": {
                "library_strategy": "AMPLICON",
                "library_source": "METAGENOMIC",
                "library_selection": "PCR",
            },
            "Amplicon indexing (with cleanup)": {
                "library_strategy": "AMPLICON",
                "library_source": "METAGENOMIC",
                "library_selection": "PCR",
            },
        }

        allowed_options = {
            "library_strategy": [
                "NGI_MANUAL",
                "WGS",
                "WGA",
                "WXS",
                "RNA-Seq",
                "ssRNA-seq",
                "snRNA-seq",
                "miRNA-Seq",
                "ncRNA-Seq",
                "FL-cDNA",
                "EST",
                "Hi-C",
                "ATAC-seq",
                "WCS",
                "RAD-Seq",
                "CLONE",
                "POOLCLONE",
                "AMPLICON",
                "CLONEEND",
                "FINISHING",
                "ChIP-Seq",
                "MNase-Seq",
                "DNase-Hypersensitivity",
                "Bisulfite-Seq",
                "CTS",
                "MRE-Seq",
                "MeDIP-Seq",
                "MBD-Seq",
                "Tn-Seq",
                "VALIDATION",
                "FAIRE-seq",
                "SELEX",
                "RIP-Seq",
                "ChIA-PET",
                "Synthetic-Long-Read",
                "Targeted-Capture",
                "Tethered Chromatin Conformation Capture",
                "NOMe-Seq",
                "ChM-Seq",
                "GBS",
                "Ribo-Seq",
                "OTHER",
            ],
            "library_source": [
                "NGI_MANUAL",
                "GENOMIC",
                "GENOMIC SINGLE CELL",
                "TRANSCRIPTOMIC",
                "TRANSCRIPTOMIC SINGLE CELL",
                "METAGENOMIC",
                "METATRANSCRIPTOMIC",
                "SYNTHETIC",
                "VIRAL RNA",
                "OTHER",
            ],
            "library_selection": [
                "NGI_MANUAL",
                "RANDOM",
                "PCR",
                "RANDOM PCR",
                "RT-PCR",
                "HMPR",
                "MF",
                "repeat fractionation",
                "size fractionation",
                "MSLL",
                "cDNA",
                "cDNA_randomPriming",
                "cDNA_oligo_dT",
                "PolyA",
                "Oligo-dT",
                "Inverse rRNA",
                "Inverse rRNA selection",
                "ChIP",
                "ChIP-Seq",
                "MNase",
                "DNase",
                "Hybrid Selection",
                "Reduced Representation",
                "Restriction Digest",
                "5-methylcytidine antibody",
                "MBD2 protein methyl-CpG binding domain",
                "CAGE",
                "RACE",
                "MDA",
                "padlock probes capture method",
                "other",
                "unspecified",
            ],
        }

        self.write(
            t.generate(
                gs_globals=self.application.gs_globals,
                user=self.get_current_user(),
                construction_methods=construction_methods,
                allowed_options=allowed_options,
            )
        )
