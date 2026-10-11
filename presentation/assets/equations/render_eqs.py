from pathlib import Path
import subprocess, textwrap
root=Path('/mnt/data/hospital-deck-v16/assets/equations')
eqs={
'eq1': r'S[\Phi] = S_{0}[\Phi] + S_{\mathrm{int}}[\Phi]',
'eq2': r'S = P_{\mathrm{sb}}\!\left(S_{\mathrm{unv}}\right).',
'eq3': r'\lvert \text{syntax structure}\rangle = \hat{\phi}^{\dagger}(f_k)\cdots \hat{\phi}^{\dagger}(f_1)\hat{\phi}^{\dagger}(f_0)\lvert 0\rangle,\qquad \forall f_i\in\mathcal{H}',
'eq4': r'\operatorname{Semantics}(\lvert\Psi_s\rangle,S_i)=\langle\Psi_s\rvert\hat{O}^{(S_i)}_{\mathrm{sem}}\lvert\Psi_s\rangle.'
}
for name, eq in eqs.items():
    tex=root/f'{name}.tex'
    tex.write_text(textwrap.dedent(rf'''
    \documentclass[border=1pt]{{standalone}}
    \usepackage{{amsmath}}
    \begin{{document}}
    \fontsize{{18}}{{22}}\selectfont
    $\displaystyle {eq}$
    \end{{document}}
    '''), encoding='utf-8')
    subprocess.run(['pdflatex','-interaction=nonstopmode','-halt-on-error',tex.name], cwd=root, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(['pdftocairo','-svg',f'{name}.pdf',f'{name}.svg'], cwd=root, check=True)
