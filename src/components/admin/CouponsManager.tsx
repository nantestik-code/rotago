import { useCallback, useEffect, useState } from 'react';
import { Copy, Gift, Loader2, Plus, Power, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  free_days: number;
  is_active: boolean;
  created_at: string;
  redemptions?: number;
}

const CouponsManager = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', free_days: 15 });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, description, free_days, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Contagem de resgates por cupom, para saber o alcance de cada campanha.
      const { data: redemptions } = await supabase
        .from('coupon_redemptions')
        .select('coupon_id');

      const counts = new Map<string, number>();
      for (const r of redemptions ?? []) {
        counts.set(r.coupon_id, (counts.get(r.coupon_id) ?? 0) + 1);
      }

      setCoupons(
        (data ?? []).map((c) => ({ ...c, redemptions: counts.get(c.id) ?? 0 })),
      );
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar cupons',
        description: error?.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCreate = async () => {
    const code = form.code.trim().toUpperCase().replace(/\s/g, '');

    if (!code) {
      toast({ title: 'Informe o código do cupom', variant: 'destructive' });
      return;
    }

    if (form.free_days < 1 || form.free_days > 365) {
      toast({
        title: 'Período inválido',
        description: 'Os dias grátis devem estar entre 1 e 365.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from('coupons').insert({
        code,
        description: form.description.trim() || null,
        free_days: form.free_days,
        created_by: user?.id ?? null,
      });

      if (error) {
        // 23505 = violacao de unicidade do codigo
        throw new Error(
          error.code === '23505'
            ? `Já existe um cupom com o código ${code}.`
            : error.message,
        );
      }

      toast({ title: 'Cupom criado', description: `${code} está pronto para uso.` });
      setForm({ code: '', description: '', free_days: 15 });
      fetchCoupons();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar cupom',
        description: error?.message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);

    if (error) {
      toast({
        title: 'Erro ao alterar o cupom',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: coupon.is_active ? 'Cupom desativado' : 'Cupom reativado',
      description: `${coupon.code} ${coupon.is_active ? 'não aceita mais resgates' : 'voltou a aceitar resgates'}.`,
    });
    fetchCoupons();
  };

  const handleDelete = async (coupon: Coupon) => {
    if (coupon.redemptions && coupon.redemptions > 0) {
      toast({
        title: 'Cupom já foi usado',
        description:
          'Cupons com resgates não podem ser apagados, para preservar o histórico. Desative-o.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase.from('coupons').delete().eq('id', coupon.id);

    if (error) {
      toast({ title: 'Erro ao apagar', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Cupom apagado', description: `${coupon.code} foi removido.` });
    fetchCoupons();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Código copiado', description: `${code} está na área de transferência.` });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-green-600" />
          Cupons
        </h2>
        <p className="text-muted-foreground">
          Códigos promocionais para divulgar em grupos. Cada cupom vale uma vez por CPF.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo cupom</CardTitle>
          <CardDescription>
            O código é salvo em caixa alta e sem espaços, então quem digitar
            &quot;grupo15&quot; ou &quot;GRUPO 15&quot; encontra o mesmo cupom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto_auto] md:items-end">
            <div>
              <Label htmlFor="coupon-code">Código</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="GRUPO15"
                maxLength={40}
                className="uppercase tracking-wider"
              />
            </div>
            <div>
              <Label htmlFor="coupon-description">Descrição (uso interno)</Label>
              <Input
                id="coupon-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Grupo de entregadores do WhatsApp"
              />
            </div>
            <div>
              <Label htmlFor="coupon-days">Dias grátis</Label>
              <Input
                id="coupon-days"
                type="number"
                min={1}
                max={365}
                value={form.free_days}
                onChange={(e) =>
                  setForm({ ...form, free_days: parseInt(e.target.value, 10) || 0 })
                }
                className="w-28"
              />
            </div>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" /> Criar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cupons cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : coupons.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Nenhum cupom criado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Dias grátis</TableHead>
                  <TableHead className="text-center">Resgates</TableHead>
                  <TableHead className="text-center">Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {coupon.description || '—'}
                    </TableCell>
                    <TableCell className="text-center">{coupon.free_days}</TableCell>
                    <TableCell className="text-center">{coupon.redemptions ?? 0}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                        {coupon.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(coupon.code)}
                          title="Copiar código"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(coupon)}
                          title={coupon.is_active ? 'Desativar' : 'Reativar'}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coupon)}
                          title="Apagar"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CouponsManager;
