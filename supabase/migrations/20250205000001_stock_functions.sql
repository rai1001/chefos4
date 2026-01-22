-- Función: Incrementar stock de ingrediente
CREATE OR REPLACE FUNCTION increment_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE ingredients
  SET stock_current = stock_current + p_quantity
  WHERE id = p_ingredient_id;
END;
$$ LANGUAGE plpgsql;


-- Función: Decrementar stock (con validación)
CREATE OR REPLACE FUNCTION decrement_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity DECIMAL
)
RETURNS void AS $$
DECLARE
  v_current_stock DECIMAL;
BEGIN
  SELECT stock_current INTO v_current_stock
  FROM ingredients
  WHERE id = p_ingredient_id;


  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for ingredient %', p_ingredient_id;
  END IF;


  UPDATE ingredients
  SET stock_current = stock_current - p_quantity
  WHERE id = p_ingredient_id;
END;
$$ LANGUAGE plpgsql;


-- Función: Registrar movimiento de stock
CREATE OR REPLACE FUNCTION register_stock_movement(
  p_organization_id UUID,
  p_ingredient_id UUID,
  p_movement_type VARCHAR,
  p_quantity DECIMAL,
  p_unit_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_purchase_order_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  INSERT INTO stock_movements (
    organization_id,
    ingredient_id,
    movement_type,
    quantity,
    unit_id,
    user_id,
    purchase_order_id,
    notes
  ) VALUES (
    p_organization_id,
    p_ingredient_id,
    p_movement_type,
    p_quantity,
    p_unit_id,
    p_user_id,
    p_purchase_order_id,
    p_notes
  )
  RETURNING id INTO v_movement_id;


  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;


COMMENT ON FUNCTION increment_ingredient_stock IS 'Aumenta el stock actual de un ingrediente';
COMMENT ON FUNCTION decrement_ingredient_stock IS 'Reduce el stock con validación de cantidad disponible';
COMMENT ON FUNCTION register_stock_movement IS 'Registra un movimiento de inventario';
